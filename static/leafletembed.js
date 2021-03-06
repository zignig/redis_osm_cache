var map;
var ajaxRequest;
var plotlist;
var plotlayers=[];
var footprintPolygon;

function onClick(e) {
  e.target.bindPopup(e.target.data, {autoPan:false,maxWidth:400})
          .openPopup();
}

function onLocationFound(e) {
    var radius = e.accuracy / 2;

    L.circle(e.latlng, radius).addTo(map);
}

function onLocationError(e) {
  map.stopLocate();
}

function permalink() {
  var center = map.getCenter();
  var lat = Math.round(center.lat * 100000000) / 100000000;
  var lon = Math.round(center.lng * 100000000) / 100000000;
  var serverUrl='http://' + window.location.hostname + '/index.php';
  var layer = map.hasLayer(osmTiles) ? "&layer=osm" : "";
  var newLoc=serverUrl + "?lat=" + lat + "&lon=" + lon + "&zoom=" + map.getZoom() + layer;
  window.location=newLoc;
}

// Layers
var osmTiles;
var mapQuestTiles;
var markers;
var max_zoom;

max_zoom = 18;


function initmap() {

  // set up AJAX request
  ajaxRequest=getXmlHttpObject();
  if (ajaxRequest==null) {
    alert ("This browser does not support HTTP Request");
    return;
  }

  // set up the map
  map = new L.Map('map',noWrap=true);

  // create the tile layers with correct attribution
  var permalink=' — <a href=#" onClick="permalink();return false;">Permalink</a>';
  var dataAttrib='Map data from <a href="http://www.osm.org" target="_blank">OpenStreetMap</a> contributors';

  var osmUrl='/{z}/{x}/{y}.png';
  var osmAttrib=dataAttrib + permalink;
  osmTiles = new L.TileLayer(osmUrl, {minZoom: 0, maxZoom: max_zoom, attribution: osmAttrib});		


  var baseLayers = {
    "MapQuest": mapQuestTiles
  };

  map.setView(new L.LatLng(0,0),3);
  map.addLayer(osmTiles);
  //L.control.layers(baseLayers, null, {position: 'topleft'}).addTo(map);
  askForPlots();

  markers = new L.MarkerClusterGroup();
  map.addLayer(markers);
  markers.on('clusterclick', function (a) { a.layer.zoomToBounds(); });
  //markers.on('dblclick', mapClick);

  // Initialize the FeatureGroup to store editable layers
  var drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // Initialize the draw control and pass it the FeatureGroup of editable layers
  var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
     }
  });
  map.addControl(drawControl);

  map.on('viewreset', onMapMove);
  map.on('dragend', onMapMove);
  map.on('draw:created', makeMarker);
}

function makeMarker(e){
    type = e.layerType;
        layer = e.layer;
    if (type === 'marker') {
        // Do marker specific actions
		saveMarker(layer);
    }
	console.log(layer);
    // Do whatever else you need to. (save to db, add to map etc)
    map.addLayer(layer);
}

function mapClick(e){
	var pos = e.latlng;
	map.setView(pos,max_zoom);
}

function saveMarker(e){
  console.log(e);
  var msg='/marker/?lat='+e._latlng.lat+'&lng='+e._latlng.lng;
  ajaxRequest.onreadystatechange = nothing;
  ajaxRequest.open('GET', msg, true);
  ajaxRequest.send(null);
}

function onMapMove(e) { askForPlots(); }

function getXmlHttpObject() {
  if (window.XMLHttpRequest) { return new XMLHttpRequest(); }
  if (window.ActiveXObject)  { return new ActiveXObject("Microsoft.XMLHTTP"); }
  return null;
}

function askForPlots() {
  // request the marker info with AJAX for the current bounds
  var bounds=map.getBounds();
  var minll=bounds.getSouthWest();
  var maxll=bounds.getNorthEast();
  var size=map.getSize();
  var msg='/box/?rect='+minll.lat+','+minll.lng+','+maxll.lat+','+maxll.lng+'&zoom='+map.getZoom()+'&width='+size.x+'&height='+size.y;
  ajaxRequest.onreadystatechange = stateChanged;
  ajaxRequest.open('GET', msg, true);
  ajaxRequest.send(null);
}

function isNumeric(s) {
  var intRegex = /^\d+$/;
  var floatRegex = /^((\d+(\.\d *)?)|((\d*\.)?\d+))$/;
  return ((intRegex.test(s) || floatRegex.test(s)));
}

function nothing(){
}

function stateChanged() {
		// if AJAX returned a list of markers, add them to the map
		if (ajaxRequest.readyState==4) {
			//use the info here that was returned
			if (ajaxRequest.status==200) {
				plotlist=eval(ajaxRequest.responseText);
				removeMarkers();
				for (i=0;i<plotlist.length;i++) {
					var plotll = new L.LatLng(plotlist[i].lat,plotlist[i].lon, true);
					var plotmark = new L.Marker(plotll);
					plotmark.data=plotlist[i];
					markers.addLayer(plotmark);
					plotmark.bindPopup("<h3>"+plotlist[i].name+"</h3>"+plotlist[i].id);
					plotlayers.push(plotmark);
				}
			}
		}
	}

function removeMarkers() {
	for (i=0;i<plotlayers.length;i++) {
		markers.removeLayer(plotlayers[i]);
	}
	plotlayers=[];
}

initmap()

