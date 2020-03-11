
function Route(name, defaultRoute) {
    try {
        if(!name ) {
            throw 'Error: "name" is a required parameter';
        }
        this.constructor(name, defaultRoute);
    } catch (e) {
        console.error(e);
    }
}

Route.prototype = {
    name: undefined,
    navElement: undefined,
    default: false,
    constructor: function (name, defaultRoute) {
        this.name = name;
        this.navElement = document.getElementById('nav-'+name);
        this.default = defaultRoute;
    },
    isActiveRoute: function (hashedPath) {
        return hashedPath.replace('#', '') === this.name;
    }
}

function Router(routes) {
    try {
        if (!routes) {
            throw 'Error: "routes" is a required parameter';
        }
        this.constructor(routes);
        this.init();
    } catch (e) {
        console.error(e);
    }
}

Router.prototype = {
    routes: undefined,
    rootElem: undefined,
    constructor: function (routes) {
        this.routes = routes;
        this.rootElem = document.getElementById('app');
    },

    init: function () {
        var r = this.routes;
        (function(scope, r) {
            window.addEventListener('hashchange', function (e) {
                scope.hasChanged(scope, r);
            });
        })(this, r);
        this.hasChanged(this, r);
    },

    hasChanged: function(scope, routes){
        if (window.location.hash.length > 0) {
            for (var route of routes) {
                if(route.isActiveRoute(window.location.hash.substr(1))) {
                    scope.updateActiveNav(route.navElement)
                    scope.goToRoute(route.name);
                }
            }
        } else {
            for (var route of routes) {
                if(route.default) {
                    scope.updateActiveNav(route.navElement)
                    scope.goToRoute(route.name);
                }
            }
        }
    },

    goToRoute: function (name) {
        (function(scope) {
            const url = 'views/' + name + '.html';
            const jsFile = 'js/' + name + '.js';
            const xhttp = new XMLHttpRequest();

            xhttp.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    scope.rootElem.innerHTML = this.responseText;

                    const body = document.getElementsByTagName("body")[0];
                    const script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.src = jsFile;
                    body.appendChild(script);
                }
            };
            xhttp.open('GET', url, true);
            xhttp.send();
        })(this);
    },

    updateActiveNav: function(navElement) {
        (function(scope) {
            var previousRoute = scope.routes.find(e => e.navElement.classList.contains('active'));
            if (previousRoute) {
                previousRoute.navElement.classList.remove('active');
            }
            navElement.classList.add('active');
        })(this);
    }
};


(function () {
    function init() {
        var router = new Router([
            new Route('home', true),
            new Route('leads'),
            new Route('opportunities'),
            new Route('reports')
        ]);
    }
    init();
}());

function drawTable(dataSet, targetElement) {
  var tableEl = document.getElementById(targetElement, tableEl);
  tableEl.innerHTML = "";
  var thead = document.createElement('thead');
  var tbody = document.createElement('tbody');
  const header = Object.keys(dataSet[0]);
  addHeader(header, thead);
  addRows(dataSet, tbody);
  tableEl.appendChild(thead);
  tableEl.appendChild(tbody);
}

function addHeader(header, container) {
  var headerRow = document.createElement('tr');

  header.forEach(function(column) {
    column = humanize(column);
    var text = document.createTextNode(column);
    var headerCell = document.createElement('th');
    headerCell.appendChild(text);
    headerRow.appendChild(headerCell);
  });

  container.appendChild(headerRow);
}

function humanize(str) {
  const specialCases = ['id'];
  var frags = str.split('_');
  for (const i in frags) {

    if (frags.length === 1 && specialCases.includes(frags[i].toLowerCase())) {
      return frags[i].toUpperCase();
    }

    frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1);
  }

  return frags.join(' ');
}

function addRows(dataSet, container) {
  dataSet.forEach(function(row) {
    var rowEl = document.createElement('tr');
    Object.values(row).forEach(function(val) {
      var text = document.createTextNode(val);
      var td = document.createElement('td');
      td.appendChild(text);
      rowEl.appendChild(td);
    });
    container.appendChild(rowEl);
  });
}
