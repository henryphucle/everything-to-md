export function prepareHTMLForMarkdown(container) {
  // 1. Handle Lists — convert Quill's flat ql-indent-N structure to nested ol/ul
  const lists = container.querySelectorAll('ol, ul');
  lists.forEach(originalList => {
    const items = Array.from(originalList.querySelectorAll(':scope > li'));
    if (items.length === 0) return;

    const newRoot = document.createElement(originalList.tagName);
    let stack = [{ level: 0, list: newRoot }];

    items.forEach(item => {
      const match = item.className.match(/ql-indent-(\d+)/);
      const level = match ? parseInt(match[1], 10) : 0;

      while (stack.length > 1 && level < stack[stack.length - 1].level) {
        stack.pop();
      }

      if (level > stack[stack.length - 1].level) {
        const lastLi = stack[stack.length - 1].list.lastElementChild;
        if (lastLi) {
          const subList = document.createElement(originalList.tagName);
          lastLi.appendChild(subList);
          stack.push({ level, list: subList });
        }
      }

      const itemClone = item.cloneNode(true);
      const classesToRemove = Array.from(itemClone.classList).filter(c => c.startsWith('ql-indent-'));
      if (classesToRemove.length > 0) itemClone.classList.remove(...classesToRemove);
      if (itemClone.classList.length === 0) itemClone.removeAttribute('class');

      stack[stack.length - 1].list.appendChild(itemClone);
    });

    originalList.replaceWith(newRoot);
  });

  // 2. Handle Tables — GFM requires <th> in first row to detect a table
  const tables = container.getElementsByTagName('table');
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const rows = table.getElementsByTagName('tr');
    if (rows.length > 0) {
      const firstRow = rows[0];
      const cells = Array.from(firstRow.getElementsByTagName('td'));
      cells.forEach(td => {
        const th = document.createElement('th');
        th.innerHTML = td.innerHTML;
        for (let k = 0; k < td.attributes.length; k++) {
          const attr = td.attributes[k];
          th.setAttribute(attr.name, attr.value);
        }
        if (td.parentNode) td.parentNode.replaceChild(th, td);
      });
    }
  }
}

export function fixHTMLForQuill(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
    let thead = table.querySelector('thead');
    let tbody = table.querySelector('tbody');

    if (thead) {
      if (!tbody) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
      }
      const headRows = Array.from(thead.querySelectorAll('tr'));
      headRows.reverse().forEach(row => tbody.prepend(row));
      thead.remove();
    }

    const ths = table.querySelectorAll('th');
    ths.forEach(th => {
      const td = document.createElement('td');
      td.innerHTML = th.innerHTML;
      if (th.className) td.className = th.className;
      th.replaceWith(td);
    });

    const cleanWhitespace = (node) => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3 && !child.textContent.trim()) {
          child.remove();
        } else if (child.nodeType === 1) {
          cleanWhitespace(child);
        }
      });
    };
    cleanWhitespace(table);
  });

  return doc.body.innerHTML;
}
