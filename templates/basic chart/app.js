(function doNotDeleteThisLine(PhoenixChart, PHOENIX_CHART_TYPE, PHOENIX_DATA_TYPE, PHOENIX_MAPPING){

  // Call this with your data to render a PhoenixChart
  function chartIt(data){
    // Set a chart type using the correct enum: https://domoapps.github.io/domo-phoenix/#/domo-phoenix/properties
    var chartType = PHOENIX_CHART_TYPE.BAR;

    // Set your "Chart Options": https://domoapps.github.io/domo-phoenix/#/domo-phoenix/api
    var options = {
      width: 600,
      height: 500
    };

    // Create the Phoenix Chart
    var chart = new PhoenixChart(chartType, data, options);

    // Append the canvas element to your app
    document.getElementById('phoenix-chart').appendChild(chart.canvas);
    
    // Render the chart when you're ready for the user to see it
    chart.render();
  }

  // Set this to use the columns in your dataset: 
  var columns = [
    {
        type: PHOENIX_DATA_TYPE.STRING,
        name: 'Region',
        mapping: PHOENIX_MAPPING.SERIES
    },
    {
        type: PHOENIX_DATA_TYPE.STRING,
        name: 'Customer Segment',
        mapping: PHOENIX_MAPPING.ITEM
    },
    {
        type: PHOENIX_DATA_TYPE.DOUBLE,
        name: 'Sales',
        mapping: PHOENIX_MAPPING.VALUE
    }
  ];


<% datasources.forEach(function(datasource){ %>
  // Start get data from <%= datasource.alias %>
  /* Remove this line to chart data from your "<%= datasource.alias %>" dataset
  getData('<%= datasource.alias %>', columns).then(function(data){
    var phoenixData = { columns: columns, rows: data };
    chartIt(phoenixData);
  });
  /* End get data from <%= datasource.alias %> */
<% }); %>


  /* Start - Delete this section when using real data  */
  var sampleData = {
    columns: columns,
    rows: [
      ['Low', 'Corporate', 8582.8875],
      ['High', 'Home Office', 14415.941],
      ['Low', 'Consumer', 1264.8215],
      ['Medium', 'Small Business', 21478.799],
      ['Critical', 'Consumer', 2621.97],
      ['Not Specified', 'Consumer', 2211.31],
      ['Critical', 'Corporate', 10087.1315],
      ['Not Specified', 'Corporate', 4407.138],
      ['High', 'Consumer', 11667.366],
      ['High', 'Corporate', 19503.323],
      ['Low', 'Small Business', 1735.3715],
      ['Low', 'Home Office', 10057.42],
      ['Medium', 'Home Office', 7691.02],
      ['Critical', 'Small Business', 4036.064],
      ['Not Specified', 'Small Business', 84.99],
      ['High', 'Small Business', 689.74],
      ['Critical', 'Home Office', 7416.828],
      ['Not Specified', 'Home Office', 1839.26],
      ['Medium', 'Consumer', 4280.034],
      ['Medium', 'Corporate', 7965.238]
    ]
  };

  chartIt(sampleData);
  /* End - Section to delete */


////// Helper functions ////////////

  // Some DataSets are massive and will bring any web browser to its knees if you
  // try to load the entire thing. To keep your app performing optimally, take
  // advantage of filtering, aggregations, and group by's to bring down just the
  // data your app needs. Do not include all columns in your data mapping file,
  // just the ones you need.
  //
  // For additional documentation on how you can query your data, please refer to
  // https://developer.domo.com/docs/dev-studio/dev-studio-data
  function getData(datasetAlias, columns){
    var query = [];
    var getQueryParams = function(cols){ return cols && cols.map(c => c.name) };
    var processGrains = function(cols) {
      var grainColumn = cols && cols.find(c => c.dategrain != null);
      if(grainColumn){
        return 'dategrain=' + grainColumn.name + ' by ' + grainColumn.dategrain;
      }

      return "";
    };

    // Create query parameters
    query.push('fields=' + getQueryParams(columns).join(","));
    query.push(processGrains(columns));
    // query.push("groupby=campaign");

    // Some DataSets are massive and will bring any web browser to its knees if you
    // try to load the entire thing. To keep your app performing optimally, take
    // advantage of filtering, aggregations, and group by's to bring down just the
    // data your app needs. Do not include all columns in your data mapping file,
    // just the ones you need. Setting the limit to 1000 will prevent enormous result
    // sets while you are experimenting.
    //
    // For additional documentation on how you can query your data, please refer to
    // https://developer.domo.com/docs/dev-studio/dev-studio-data
    return domo.get('/data/v1/' + alias + '?limit=1000&' + query.join('&'));
  }

// The line below passes the DomoPhoenix globals to this IIFE to make using them easier
// Read more about Immediately Invoked Function Expression (IIFE): https://developer.mozilla.org/en-US/docs/Glossary/IIFE
})(DomoPhoenix.PhoenixChart, DomoPhoenix.PHOENIX_CHART_TYPE, DomoPhoenix.PHOENIX_DATA_TYPE, DomoPhoenix.PHOENIX_MAPPING);

