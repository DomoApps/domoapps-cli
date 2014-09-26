# Manifest Format

The manifest is a file that is used to provide meta-data about a design or app and the data it uses.

## Example

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
"id": "675ab7fb-3d6d-4e21-aaa6-a5269adeec46",
"draft": false
}
```

