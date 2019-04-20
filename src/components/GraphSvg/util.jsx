export const spliceUtil = function(object, item) {
  if (object.indexOf(item) === -1) return;
  object.splice(object.indexOf(item), 1);
};

export const useExperimentalFeature = (featureName)=> {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
    vars[key] = value;
  });
  return (vars.useExperimentalFeatures || '').split(',').includes(featureName) || vars.useExperimentalFeatures === 'all'
};