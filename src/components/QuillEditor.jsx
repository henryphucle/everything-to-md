import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

export default function QuillEditor({ onChange, onReady }) {
  const wrapperRef = useRef(null);
  // Use refs for callbacks to avoid stale closures without re-initializing Quill
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    const icons = Quill.import('ui/icons');
    icons['table-delete'] = '<i class="fa-solid fa-trash-can" style="font-size: 14px;"></i>';

    // Create a fresh child div for Quill. Quill inserts .ql-toolbar as a sibling
    // BEFORE this element, so everything (toolbar + editor) lands inside wrapperRef.
    // Cleanup can then wipe wrapperRef.innerHTML to remove both — fixes StrictMode duplicate.
    const container = document.createElement('div');
    wrapperRef.current.appendChild(container);

    const q = new Quill(container, {
      theme: 'snow',
      placeholder: 'Start writing your rich text...',
      modules: {
        table: true,
        toolbar: {
          container: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'table', 'table-delete', 'clean'],
          ],
          handlers: {
            'table-delete': function () {
              const tableModule = q.getModule('table');
              if (tableModule) tableModule.deleteTable();
            },
          },
        },
      },
    });

    const deleteBtn = wrapperRef.current.querySelector('.ql-table-delete');
    if (deleteBtn) deleteBtn.setAttribute('title', 'Delete Table');

    q.on('text-change', () => onChangeRef.current(q.root.innerHTML));
    onReadyRef.current(q);

    return () => {
      q.off('text-change');
      if (wrapperRef.current) wrapperRef.current.innerHTML = '';
    };
  }, []); // empty deps — Quill init runs once only

  return <div ref={wrapperRef} id="editor" />;
}
