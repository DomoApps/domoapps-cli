export default function isValidJSName(name){
  return name.match ? !name.match(/[^a-zA-Z\$\_\d]+/) : false;
}
