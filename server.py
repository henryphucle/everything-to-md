import asyncio
import json
import os
import tempfile
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from markitdown import MarkItDown

app = FastAPI(title="everythingToMD API")
converter = MarkItDown(enable_plugins=False)

MAX_SIZE = 50 * 1024 * 1024  # 50 MB


@app.post("/api/convert")
async def convert_file(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    _, ext = os.path.splitext(filename)
    if not ext:
        raise HTTPException(status_code=400, detail="File must have an extension so the converter can detect its type.")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large — maximum is 50 MB.")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        result = converter.convert(tmp_path)
        markdown = result.text_content or ""
        if not markdown.strip():
            raise HTTPException(status_code=422, detail="No text content could be extracted from this file.")
        return {"markdown": markdown, "filename": filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Conversion failed: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@app.post("/api/convert-stream")
async def convert_file_stream(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    _, ext = os.path.splitext(filename)
    if not ext:
        raise HTTPException(status_code=400, detail="File must have an extension so the converter can detect its type.")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large — maximum is 50 MB.")

    ext_lower = ext.lower()

    async def generate():
        tmp_path = None
        try:
            if ext_lower == ".pdf":
                try:
                    import fitz  # PyMuPDF
                    doc = fitz.open(stream=content, filetype="pdf")
                    total = len(doc)
                    parts = []
                    for i in range(total):
                        text = doc[i].get_text()
                        if text.strip():
                            parts.append(text)
                        yield _sse({"current": i + 1, "total": total, "unit": "pages"})
                        await asyncio.sleep(0)  # yield to event loop between pages
                    markdown = "\n\n---\n\n".join(parts)
                    yield _sse({"done": True, "markdown": markdown, "filename": filename})
                    return
                except ImportError:
                    pass  # PyMuPDF not available — fall through to MarkItDown

            # All other file types (and PDF fallback): run MarkItDown
            yield _sse({"current": 0, "total": 1, "unit": "file"})
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            result = await asyncio.to_thread(converter.convert, tmp_path)
            markdown = result.text_content or ""
            if not markdown.strip():
                yield _sse({"error": "No text content could be extracted from this file."})
                return
            yield _sse({"current": 1, "total": 1, "unit": "file"})
            yield _sse({"done": True, "markdown": markdown, "filename": filename})

        except Exception as e:
            yield _sse({"error": str(e)})
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    return StreamingResponse(generate(), media_type="text/event-stream")


# Static files must be mounted last so API routes take precedence.
app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
