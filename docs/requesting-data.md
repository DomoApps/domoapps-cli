# Requesting Data

Domo Apps designs can request data by making an HTTP GET request to `data/v1/[Data Source Alias]`

## Examples

```json
"mapping": [
  {
    "alias": "sales",
    "dataSourceId": "5168da8d-1c72-4e31-ba74-f609f73071dd",
    "fields": []
  }
]
```

If the above mapping was present in the `manifest.json` file, then a query for the "sales" data might look like the following.

### XHR

```javascript
var xhr = new XMLHttpRequest();
xhr.open('GET', 'data/v1/sales', true);
xhr.onload = function(e) {
  if (this.status == 200) {
    var json = JSON.parse(xhr.response)
    var salesSum = 0;
    for(var i = 0; i < json.length; i++) {
      salesSum += json[i].amount
    }
  }
};
xhr.send();
```

### jQuery Example

```javascript
$.get( 'data/v1/sales', function( json ) {
  var totalAmount = 0;
  for(var i = 0; i < json.length; i++)
    totalAmount += json[i].amount;
});
```

## Data Format

Requested data will be returned in an array-of-objects format like this.

```json
[ {"first": "Joe", "last": "Jacobs", "age":39},
  {"first": "Henry", "last": "Woolington", "age":23} ]
```

As you can see, each item of data is a *value* associated with a *property name* where the *property name* is set as one of two things.

1. The name of the column in the data source

    OR

2. The name of the alias, as defined in the mapping section of the manifest.

If the fields are left unmapped, as in the following example, then data requested from the `sales` alias will be formatted with the column names in the original data source.

```json
"mapping": [
  {
    "alias": "sales",
    "dataSourceId": "5168da8d-1c72-4e31-ba74-f609f73071dd",
    "fields": []
  }
]
```

Designs that do not specify the fields they request should never be wired up to a different data source, unless the exact same column names exist in that data source.

The fields object could be amended like this to specify aliases for the data.

```json
"fields": [
{
  "alias": "amount",
  "columnName": "Sales Amount"
},
{
  "alias": "date",
  "columnName": "Contract Initiation Date"
}
]
```

This would allow the design to access the data in the `Sales Amount` column of the associated data source by the alias of `sales`.

## Column Filtering

There are many ways to filter the data that is requested such that you receive a subset of the data contained in the Data Source.

### Mapping Filters

If your design does not need all columns that are available in a data source, then the columns that get returned in all data requests can be limited by specifying the needed fields in the `fields` section of the mapping object in the manifest.

For example, if the mapping object for my sales data source looks like this, than any request I make for data will only return the data from the Sales Amount, Contract Initiation Date, and Customer Name columns in the data source.

```json
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
      "alias": "date",
      "columnName": "Contract Initiation Date"
    },
    {
      "alias": "name",
      "columnName": "Customer Name"
    }
    ]
  }
]
```

### Dynamic Queries

If the design needs to retain access to multiple fields, but sometimes makes requests for a specific subset of those fields, then the query parameter `filter` can be used in the HTTP GET request.

For example, given the mapping from the [Mapping Filters](#Mapping-Filters) section above, we could request just the `amount` and `date` information by making a request to this URL.

```javascript
data/v1/sales?fields=amount,date
```

## Data Filtering

The specific data that gets included in a data request can be narrowed down using more fine grained filtering by using the `filter` query parameter.

```javascript
data/v1/sales?filter=amount > 1000, name contains 'Foobar'
```

## Operators

The available comparison operators are as follows. When multiple keywords can be used to specify an operator, they are separated by the pipe (`|`) character.

```
< | lessthan - Less than
<= | lessthanorequals - Less than or equals
> | greaterthan - Greater than
>= |  greaterthanorequals - Greater than or equals
= | == | equals - Equals
~ | contains - Contains
```

## Comparison Values

The item on the right hand side of the operator is called a value. Values can be single quoted or not, and can contain any characters except `&`, `'`, and `,`.

## Date Filtering

The `<`, `<=`, `>`, `>=` and equivalent operators function as date filters when used on a column that is a Date. This way, queries can be constructed that return data based on date.
