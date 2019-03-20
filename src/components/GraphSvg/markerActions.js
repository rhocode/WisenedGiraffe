export const appendMarkerAttributes = (marker) => {
  return marker.attr('viewBox', '0 -5 10 10')
    .attr('markerWidth', 3.5)
    .attr('markerHeight', 3.5)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5');
};