export default function isValidJSName(name: string) {
  return name.match ? !name.match(/[^a-zA-Z$_\d]+/) : false;
}
