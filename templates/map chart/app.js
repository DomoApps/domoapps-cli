// For more on how to use Phoenix view the documentation at:
// https://domoapps.github.io/domo-phoenix/

// Call this with your data to render a PhoenixChart
function chartIt(data){
  // Set a chart type using the correct enum: https://domoapps.github.io/domo-phoenix/#/domo-phoenix/properties
  var chartType = DomoPhoenix.CHART_TYPE.MAP_WORLD;

  // Set your "Chart Options": https://domoapps.github.io/domo-phoenix/#/domo-phoenix/api
  var options = {
    width: 650,
    height: 400
  };

  // Create the Phoenix Chart
  var chart = new DomoPhoenix.Chart(chartType, data, options);

  // Append the canvas element to your app
  document.getElementById('phoenix-chart').appendChild(chart.canvas);
  
  // Render the chart when you're ready for the user to see it
  chart.render();
}


// Set this to use the columns in your dataset: 
var columns = [
  {
    type: DomoPhoenix.DATA_TYPE.STRING,
    name: 'Country',
    mapping: DomoPhoenix.MAPPING.ITEM
  },
  {
    type: DomoPhoenix.DATA_TYPE.DOUBLE,
    name: 'Sales',
    mapping: DomoPhoenix.MAPPING.VALUE
  }
];


<% datasources.forEach(function(datasource){ %>
// Start get data from <%= datasource.alias %>
/* Remove this line to chart data from your "<%= datasource.alias %>" dataset
getData('<%= datasource.alias %>', columns).catch(displayError).then(function(data){
  if(data){
    var phoenixData = { columns: columns, rows: data };
    chartIt(phoenixData);
  }
});
/* End get data from <%= datasource.alias %> */
<% }); %>


/* Start - Delete this section when using real data  */
var sampleData = {
  columns: columns,
  rows: [
    ['United States', 6246579581],
    ['Japan', 654321651],
    ['Canada', 3241226513],
    ['Australia', 465846524],
    ['Brazil', 56465432],
    ['Madagascar', 121365432]
  ]
};

chartIt(sampleData);
/* End - Section to delete */



////// Query Data ////////////
function getData(datasetAlias, columns){
  // Create a query object
  // For a full list of "query operators" see: https://developer.domo.com/docs/dev-studio-references/data-api
  var query = {
    "fields": getColumnNames(columns)
  };

  // Handle date grains
  processGrains(columns, query);

  // Some DataSets are massive and will bring any web browser to its knees if you
  // try to load the entire thing. To keep your app performing optimally, take
  // advantage of filtering, aggregations, and group by's to bring down just the
  // data your app needs. Do not include all columns in your data mapping file,
  // just the ones you need. Setting the limit to 10000 will prevent enormous result
  // sets while you are experimenting.
  return domo.get(makeQueryString(datasetAlias, query) + '&limit=10000');
}






////// Helper functions ////////////
function makeQueryString(datasetAlias, queryObject){
  var query = '/data/v1/' + datasetAlias + '?';
  for(var key in queryObject){
    if (queryObject.hasOwnProperty(key)) {
      var value = queryObject[key];
      if(typeof value === "object" && value[0] != null){
        value = value.join(",");
      }
      query += "&" + key + "=" + value;
    }
  }

  return query;
}

function getColumnNames(cols){ 
  var names = [];
  for(var i in cols){
    if(cols[i] && cols[i].name) names.push(cols[i].name);
  }
  return names;
}

function processGrains(cols, query) {
  var grainColumn = null;
  for(var i in cols){
    if(cols[i] && cols[i].dateGrain != null){
      grainColumn = cols[i];
      break;
    }
  }
  if(grainColumn){
    query.dategrain = "'" + grainColumn.name + "' by " + grainColumn.dateGrain;
    var groupBys = [];
    for(var i in cols){
      if(cols[i] && cols[i].type === DomoPhoenix.DATA_TYPE.STRING){
        groupBys.push(cols[i] && ("'" + cols[i].name + "'"));
      }
    }
    if(query.groupby != null){
      typeof query.groupby === "string" && (query.groupby = query.groupby.split(","));
      for(var i in groupBys){
        const withoutParens = groupBys[i].replace(/'/g, "");
        if(query.groupby.indexOf(groupBys[i]) === -1 && query.groupby.indexOf(withoutParens) === -1){
          query.groupby.push(groupBys[i]);
        }
      }
    }
    else{
      query.groupby = groupBys;
    }
  }
}

function displayError(){
  document.body.appendChild(document.createTextNode('Error getting data'));
}
