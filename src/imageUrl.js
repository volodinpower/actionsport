export function getImageUrl(path) {
  // path — всегда что-то типа "/static/images/xxx.jpg"
  return `http://localhost:8000${path}`;
}
