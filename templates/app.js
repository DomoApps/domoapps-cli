<% datasources.forEach(function(datasource, index){ %>// fetch data
domo.get('/data/v1/<%= datasource.alias %>')
    .then(function(<%= datasource.alias %>){
      console.log("<%= datasource.alias %>", <%= datasource.alias %>);
    });
<%});%>