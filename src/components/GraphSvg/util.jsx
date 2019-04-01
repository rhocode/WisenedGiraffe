export const spliceUtil = function(object, item) {
  if (object.indexOf(item) === -1) return;
  object.splice(object.indexOf(item), 1);
};