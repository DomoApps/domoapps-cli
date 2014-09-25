## Migration

This guide explains how to migrate an existing mason app to the new Domo Apps platform. Much of the process has been automated using the `domo migrate` command of domoapps-cli, but some manual steps are still necessary.

## Prep New Design

2. Open your terminal and navigate to a folder where you would like to store your domoapp design.
3. In this folder create a `manifest.json` file containing the following:
    
    ```json
    {
      "name": "mydesign",
      "version": "0.0.1"
    }
    ```
  Replacing "mydesign" with the name of your design.
4. In this folder also create an `index.html` file containing whatever markup your design will use. 
This is the main entry point of the domoapp. Here you include any other assets (JavaScript, CSS, images etc) you want your design to load. For example:

    ```html
    <html>
      <head>
        <link rel="stylesheet" href="style.css">
      </head>
      <body>
        <h1>My App</h1>
        <script src="app.js"></script>
      </body>
    </html>
    ```
  Previously Mason designs would automatically load the JS and CSS, in the new platform you need to link it in the index.html like the example above.

## Move Card to New Platform

1. Find the existing card's unique id by visiting the card's details page. The id will be the last set of numbers in the URL, e.g. /page/1905765842/details/**1342622060**

5. Make sure you have the [domoapps CLI](../README.md) installed. Login using `domo login`, then make sure you're in the directory of your design and run `domo migrate`. It will prompt you for the customer and the card id you found in step 1. Running the migrate command publishes a new design and links the specified card to it, causing it to be rendered with the new domoapps platform.

## Transfer Your Wiring

### Introduction

Previously, all data what was wired to a mason app would be supplied to the app on load within the `$badge.data` object. This has been replaced with a new method where data is requested on demand via HTTP GET requests. The data is requested by an alias that can then be wired up to any data source. This way the design doesn't need any information about the data source, and can just refer to the alias instead.

The wiring information is now contained in your `manifest.json` as part of a `mapping` object. This object maps an alias to an actual data source Id. Each requested column in the data source is also mapped to an alias, so the design can refer to that specific item of data without having specific knowledge of the data source it comes from.

### Example Mapping

Here is an example of a mapping object.

```json
"mapping": [
  {
    "alias": "sales",
    "dataSourceId": "5168da8d-1c72-4e31-ba74-f609f73071dd",
    "fields": [
      {
        "alias": "amount",
        "columnName": "Sales Amount",
        "type": "Decimal"
      },
      {
        "alias": "name",
        "columnName": "Client Name",
        "type": "String"
      },
      {
        "alias": "startDate",
        "columnName": "Contract Initiation Date",
        "type": "Date"
      }
    ]
  }
]
```

In this example, a data source containing sales information is given the alias `sales`. Three of the columns from the data source are selected, "Sales Amount", "Client Name", and "Contract Initiation Date". These are given the field aliases of "amount", "name", and "startDate" respectively.

### Field Types

Possible field types are:

```
String
Integer
Decimal
Date
DateTime
Time
```

### Template Mapping

Use this object as a template for your mapping object.

```json
"mapping": [
  {
    "alias": "[Data Source Alias]",
    "dataSourceId": "[Data Source Id]",
    "fields": [
      {
        "alias": "[Field Alias]",
        "columnName": "[Data Source Column Name]",
        "type": "[Column Type]"
      }
    ]
  }
]
```

Replace all bracketed items with your data, and then add it into your `manifest.json` file next to the `name` and `version`.

```json
{
  "name": "mydesign",
  "version": "0.0.1",
  [Add mapping HERE]
}
```

## Request the Data

Now that you have wired up your data to aliases, you can request it in your app. Requests are made to this relative URL.

```
data/v1/[Data Source Alias]
```

In the previous platform, data came back as an array-of-arrays. Something like this.

```json
[ ["first", "last", "age"],
  ["Joe", "Jacobs", "39"],
  ["Henry", "Woolington", "23"] ]
```

In the new platform, data comes in this much more easily digestible format of array-of-objects.
```json
[ {"first": "Joe", "last": "Jacobs", "age":39},
  {"first": "Henry", "last": "Woolington", "age":23} ]
```

This allows you to access the specific field of an object directly, as appears in the XHR and jQuery examples below. In addition, data is type sensitive, so numeric data is unquoted in the array-of-objects and needs no conversion from String to Int or Float.

### XHR Example

Here is an example using the `sales` alias from the above mapping example to get the sum of all sales amounts.

```javascript
var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function() {
	if (xhr.readyState == 4) {
		var json = JSON.parse(xhr.responseText);
		var salesSum = 0;
		for(var i = 0; i < json.length; i++) {
			salesSum += json[i].amount
		}
	}
}
xhr.open('GET', 'data/v1/sales', true);
xhr.send(null);
```

### jQuery Example

The same example is a bit simpler using jQuery.

```javascript
$.get( 'data/v1/sales', function( json ) {
  var totalAmount = 0;
  for(var i = 0; i < json.length; i++)
    totalAmount += json[i].amount;
});
```

## Remove Obsolete Code

Apps on the old platform will have some obsolete code that needs removing.

Apps can now be developed using real data from live data sources as described above, so default data is no longer necessary. Remove any references to `$badge.data` or `$data`, as they will no longer function.
