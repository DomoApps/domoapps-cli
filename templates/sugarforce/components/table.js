function drawTable(dataSet, targetElement, {idColumn='id', editable=false, action} = {}) {
  var tableEl = document.getElementById(targetElement, tableEl);
  tableEl.innerHTML = "";
  if(!dataSet || !dataSet.length) {
    tableEl.append("No items to display yet!");
    return;
  }

  var thead = document.createElement('thead');
  var tbody = document.createElement('tbody');
  const header = Object.keys(dataSet[0]);
  addHeader(header, thead, idColumn);
  addRows(dataSet, tbody, idColumn, editable, {action});
  tableEl.appendChild(thead);
  tableEl.appendChild(tbody);

  removeSpinner();
}

function addHeader(header, container, idColumn) {
  var headerRow = document.createElement('tr');

  header.forEach(function(column) {
    if (column === idColumn) {
      return;
    }
    var text = document.createTextNode(humanize(column));
    var headerCell = document.createElement('th');
    headerCell.setAttribute('data-column-name', column);
    headerCell.appendChild(text);
    headerRow.appendChild(headerCell);
  });

  container.appendChild(headerRow);
}

function addRows(dataSet, container, idColumn, editable, {action}) {
  dataSet.forEach(function(row) {
    var tr = document.createElement('tr');
    const id = row[idColumn];
    tr.setAttribute('id', id);
    Object.entries(row).forEach(function([key, val]) {
      if (key === idColumn) {
        return;
      }

      const td = document.createElement('td');
      td.setAttribute('data-value', val);

      if (checkIfFile(val)) {
        const a = document.createElement('a');
        a.setAttribute('href', val);
        a.appendChild(document.createTextNode('Download'))
        a.addEventListener('click', function(e) {
          e.stopPropagation();
        });
        tr.appendChild(td).appendChild(a);

        return;
      }

      td.appendChild(document.createTextNode(val));
      tr.appendChild(td);
    });
    tr.addEventListener('click', function(e) {
      e.stopImmediatePropagation();
      drawModalWithTableData(e, id, editable, {action});
    });
    container.appendChild(tr);
  });
}

function drawModalWithTableData(e, id, editable, {action}) {
  const data = getTableValues(e.path);

  const modal = new Modal(data, {id, editable, action});
  modal.open();
}

function getTableHeaders(path) {
  const tableIdx = path.map(node => node.nodeName).indexOf('TABLE');
  const header = path[tableIdx].tHead.children[0].children;

  return Array.from(header).map(el => el.getAttribute('data-column-name'));
}

function getTableValues(path) {
  const pathIdx = path.map(node => node.nodeName).indexOf('TR');
  const row = path[pathIdx].children;
  const colVals = Array.from(row).map(el => el.getAttribute('data-value'));

  const headers = getTableHeaders(path);

  const values = {};
  for (const i in headers) {
    values[headers[i].trim()] = colVals[i].trim();
  }

  return values;
}

