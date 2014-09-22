To migrate an exiting (mason) app: 

1. Find the existing card's unique id by visiting the card's details page. The id will be the last set of numbers in the URL, e.g. /page/1905765842/details/**1342622060**
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

5. Make sure you have the [domoapps CLI](../README.md) installed. Login using `domo login`, then make sure you're in the directory of your design and run `domo migrate`. It will prompt you for the customer and the card id you found in step 1. Running the migrate command publishes a new design and links the specified card to it, causing it to be rendered with the new domoapps platform.

6. Add a mapping to your manifest.json file for each datasource you're using in your original app. If the `fields` are unspecified for a datasource, then all fields will be fetched on a request.

    ```json
    {
      "name": "mydesign",
      "version": "0.0.1",
      "mapping": [
      {
        "name": "employees",
        "id": "<datasource id here>",
        "fields": []
      },
      {
        "name": "sales",
        "id": "<datasource id here>",
        "fields": [
        {
          "name": "date",
          "id": "<datasource field name here>",
          "type": "Date"
        },
        {
          "name": "amount",
          "id": "<datasource field name here>",
          "type": "Number"
        },
        {
          "name": "description",
          "id": "<datasource field name here>",
          "type": "String"
        }
        ]
      }
      ]
    }
    ```

7. Update your javascript code to include REST calls to get the required data.

    ```javascript
    $.get( "domodata/v1/sales", function( data ) {
      var json = $.parseJSON(data);
      var totalAmount = 0;
      for(var i = 0; i < json.length; i++)
        totalAmount += json[i].amount;
    }
    ```
