# Manifest Format

The manifest is a file that is used to provide meta-data about a design or app and the data it uses. The manifest file should be placed in the base directory of your app and should be named `manifest.json`.

## Example

Here is an example demonstrating a complete manifest file.

```json
{
"name": "My Design",
"version": "0.0.1",
"mapping": [
  {
    "alias": "sales",
    "dataSourceId": "5168da8d-1c72-4e31-ba74-f609f73071dd",
    "fields": [
      {
        "alias": "amount",
        "columnName": "Sales Amount"
      },
      {
        "alias": "name",
        "columnName": "Client Name"
      },
      {
        "alias": "startDate",
        "columnName": "Contract Initiation Date"
      }
    ]
  }
],
"id": "675ab7fb-3d6d-4e21-aaa6-a5269adeec46"
}
```

## Base properties

The manifest has the following base properties.

* name
* version
* mapping
* id
* draft

### Name

This is the name of the design as it will appear in Domo. This is the name that users should look for when creating a card that is based off your design.

### Version

This is the current version of your design, and should follow [semantic versioning](http://semver.org/) guidelines.

> MAJOR version when you make incompatible API changes,
>
> MINOR version when you add functionality in a backwards-compatible manner, and
>
> PATCH version when you make backwards-compatible bug fixes.

### Mapping

This contains the mapping, wiring, or aliases that are used to connect data into your app. It is discussed in more detail [below](#Data-Source-Mapping)

### id

This is a unique identifier for your design. It is added to the manifest automatically by the command line tool.

## Data Source Mapping

The `mapping` base property is a list of data source mappings that the design uses. Each data source mapping object has the following format.

```json
{
  "alias": "sales",
  "dataSourceId": "5168da8d-1c72-4e31-ba74-f609f73071dd",
  "fields": []
}
```

As seen above, the properties in the mapping object are as follows.

* alias
* dataSourceId
* fields

### alias

The data source alias is the name that is used to refer to this data source. Since individual apps can determine which specific data source is used, an alias is needed for the design to refer to the data source.

This alias is used by the design to request data using HTTP GET requests.

```javascript
data/v1/[Data Source Alias]
```

For example, if a design were requesting the data in the data source aliased as `sales`, it may form a request like this.

```javascript
var xhr = new XMLHttpRequest();
xhr.open('GET', 'data/v1/sales', true);
xhr.onload = function(e) {
  if (this.status == 200) {
    var json = JSON.parse(xhr.response)
    // Process data here
  }
};
xhr.send();
```

Or using jQuery like this.

```javascript
$.get( 'data/v1/sales', function( json ) {
  // Process data here
});
```

### dataSourceId

This is the unique id representing the data source that is used to provide data to this alias. This id can be obtained by viewing the data source in Domo and looking at the url.

```
https://company.domo.com/datasources/*f3bd3e25-b686-401d-ad2f-a414f4ea61f4*/details-nondap
```

### fields

This property contains information about what fields are included in responses when a data source is requested. More specific information about the `fields` property is contained in the [Field Mapping](#Field-Mapping) section below.

## Field Mapping

The `fields` property of a data source mapping may contain a list of fields, or columns from the data source, that the app uses.

A `field` object looks like this.

```json
{
  "alias": "amount",
  "columnName": "Sales Amount"
}
]
```

A field object has the following properties.

* alias
* columnName

If the `field` property is empty and does not contain any `field` objects, then all columns from the data source will be returned when the data source requests data. Since no field aliases are defined in this case, the original column names are used to index the data.

### alias

This is the name used to refer to a specific column in a data source. When data is requested, it is returned in the following array-of-objects format.

```json
[ {"first": "Joe", "last": "Jacobs", "age":39},
  {"first": "Henry", "last": "Woolington", "age":23} ]
```

In this example, `first`, `last`, and `age` are the property names associated with the data from each row in the data source. The field alias defined in the manifest determines the names of these properties.

This allows the design to easily access the data by name like this.

```javascript
function printData(json) {
  console.log(json.first, json.last, json.age)
}
```

*Note*: If the `fields` property in a data source mapping is left empty (i.e. no field objects are defined), then the original column name from the data source will be used in place of the field alias.

### columnName

This is the actual name of the column in the data source that the field alias gets mapped to.
