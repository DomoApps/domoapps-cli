<% datasources.forEach(function(datasource, index){ %><% if (index === 0) { %>// Some DataSets are massive and will bring any web browser to its knees if you
// try to load the entire thing. To keep your app performing optimally, take
// advantage of filtering, aggregations, and group by's to bring down just the
// data your app needs. Do not include all columns in your data mapping file,
// just the ones you need.
//
// For additional documentation on how you can query your data, please refer to
// https://developer.domo.com/docs/dev-studio/dev-studio-data<% } %>
domo.get('/data/v1/<%= datasource.alias %>?limit=10')
    .then(function(<%= datasource.alias %>){
      console.log("<%= datasource.alias %>", <%= datasource.alias %>);
    });
<%});%>
