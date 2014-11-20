// get data from the datasource that has been mapped to "people" in the manifest.json file.
var xhr = new XMLHttpRequest();
xhr.open('GET', '/data/people');
xhr.onload = function(e) {
  if (this.status == 200) {
    var people = JSON.parse(this.response);
    console.log(people);
  }
};
xhr.send();