require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/widgets/Home",
  "esri/widgets/Sketch",
  "esri/layers/GraphicsLayer",
  "esri/widgets/LayerList",
  "esri/widgets/Measurement",
  "esri/widgets/BasemapGallery",
  "esri/widgets/NavigationToggle",
  "esri/geometry/geometryEngine",  // ✅ add this
  "esri/Graphic" 
], function (Map, MapView, FeatureLayer, Home, Sketch, GraphicsLayer, LayerList, Measurement, BasemapGallery, NavigationToggle, geometryEngine, Graphic) {
  
  // ══════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════
const USA_EXTENT = {
  xmin: -125,
  ymin: 24,
  xmax: -66,
  ymax: 50,
  spatialReference: { wkid: 4326 }
};

  const clusterConfig = {
  type: "cluster",
  clusterRadius: "80px",
  popupTemplate: {
    title: "Cluster of {cluster_count} cities",
    content: "This cluster contains {cluster_count} cities"
  },
  clusterMinSize: "24px",
  clusterMaxSize: "60px"
};


  // ══════════════════════════════════════════════
  // MAP SETUP
  // ══════════════════════════════════════════════
  const map = new Map({
    basemap: "streets-navigation-vector"
  });

const view = new MapView({
  container: "viewDiv",
  map: map,
  extent: USA_EXTENT,
  highlightOptions: {
    color: [0, 255, 255, 1],
    fillOpacity: 0.4,
    haloColor: [0, 255, 255],
    haloOpacity: 1
  }
});


// ══════════════════════════════════════════════
// LAYERS
// ══════════════════════════════════════════════

// States — boundary outline only
const statesLayer = new FeatureLayer({
  url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer/2",
  title: "States",
  outFields: ["*"],
   popupEnabled: false,
   labelsVisible: true,
   labelingInfo: [{
      minScale: 50000000,  // visible at national level
      maxScale: 5000000,   // hide when zoomed into state level
      labelExpressionInfo: {
        expression: `$feature.state_abbr`  // show abbreviation at small scale
      },
      symbol: {
        type: "text",
        color: [30, 30, 30, 1],
        haloColor: [255, 255, 255, 0.8],
        haloSize: 2,
        font: { size: 10, weight: "bold" }
      },
      labelPlacement: "always-horizontal"
    },
    // LEVEL 2 — State level — show full state name
    {
      minScale: 5000000,   // visible when zoomed to state
      maxScale: 500000,    // hide when zoomed to county level
      labelExpressionInfo: {
        expression: `$feature.state_name`  // show full name at medium scale
      },
      symbol: {
        type: "text",
        color: [30, 30, 30, 1],
        haloColor: [255, 255, 255, 0.8],
        haloSize: 2,
        font: { size: 12, weight: "bold" }
      },
      labelPlacement: "always-horizontal"
    }
  ],
  renderer: {
    type: "simple",
    symbol: {
      type: "simple-fill",
      color: [0, 0, 0, 0],  // fully transparent fill
      outline: {
        color: [40, 40, 40, 1],  // dark border
        width: 0.75
      }
    }
  }
});

// Counties — demographic data
const countiesLayer = new FeatureLayer({
  url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/2",
  title: "Counties",
  visible:true,
  outFields: [
    "objectid", "NAME", "STATE_NAME", 
    "POP2007", "POP2000", "POP07_SQMI",
    "MED_AGE", "HOUSEHOLDS", "AVE_HH_SZ"
  ],
  layerId: 2,
  geometryPrecision: 2,  // ✅ simplifies geometry
  labelsVisible: true,
  labelingInfo: [{
    minScale: 3000000,   // show at state zoom level
    maxScale: 0,         // show all the way to street level
    labelExpressionInfo: {
      expression: `
        var name = $feature.NAME;
        var pop = $feature.POP2007;
        return name + TextFormatting.NewLine + Text(pop, "#,###");
      `
    },
    symbol: {
      type: "text",
      color: [50, 50, 50, 1],
      haloColor: [255, 255, 255, 0.8],
      haloSize: 1.5,
      font: { size: 9, weight: "bold" }
    },
    labelPlacement: "always-horizontal"
  }
],
  renderer: {
    type: "class-breaks",
    field: "POP07_SQMI",
    classBreakInfos: [
      {
        minValue: 0,
        maxValue: 50,
        label: "< 50 per sq mile",
        symbol: {
          type: "simple-fill",
          color: [240, 228, 248, 0.7],
          outline: { color: [200, 200, 200, 0.3], width: 0.3 }
        }
      },
      {
        minValue: 50,
        maxValue: 200,
        label: "50 - 200 per sq mile",
        symbol: {
          type: "simple-fill",
          color: [188, 143, 220, 0.7],
          outline: { color: [200, 200, 200, 0.3], width: 0.3 }
        }
      },
      {
        minValue: 200,
        maxValue: 1000,
        label: "200 - 1000 per sq mile",
        symbol: {
          type: "simple-fill",
          color: [128, 0, 188, 0.7],
          outline: { color: [200, 200, 200, 0.3], width: 0.3 }
        }
      },
      {
        minValue: 1000,
        maxValue: 999999999,
        label: "> 1000 per sq mile",
        symbol: {
          type: "simple-fill",
          color: [63, 0, 125, 0.7],
          outline: { color: [200, 200, 200, 0.3], width: 0.3 }
        }
      }
    ]
  },
  popupEnabled: true,
  popupTemplate: {
    title: "{NAME} County, {STATE_NAME}",
    content: [{
      type: "fields",
      fieldInfos: [
        { fieldName: "POP2000", label: "Population (2000)", format: { digitSeparator: true } },
        { fieldName: "POP2007", label: "Population (2007)", format: { digitSeparator: true } },
        { fieldName: "POP07_SQMI", label: "Density (per sq mile)", format: { places: 1 } },
        { fieldName: "MED_AGE", label: "Median Age" },
        { fieldName: "HOUSEHOLDS", label: "Households", format: { digitSeparator: true } },
        { fieldName: "AVE_HH_SZ", label: "Avg Household Size", format: { places: 1 } }
      ]
    }]
  }
});

// Highways
const highwaysLayer = new FeatureLayer({
  url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer/1",
  title: "Highways",
  outFields: ["*"],
  popupEnabled: true,
   renderer: {
    type: "simple",
    symbol: {
      type: "simple-line",
      color: [220, 50, 50, 0.8],  // red
      width: 1.5
    }
  },
  popupTemplate: {
  title: "Highway: {route}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "route", label: "Route" },
        { fieldName: "type", label: "Highway Type" },
        { fieldName: "length", label: "Length (miles)", 
          format: { places: 1, digitSeparator: true } }
      ]
    }
  ]
}
});

// Cities
const citiesLayer = new FeatureLayer({
  url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer/0",
  title: "Cities",
  outFields: ["*"],
  labelsVisible: true,
labelingInfo: [
  {
    minScale: 1000000,  // only show city names when zoomed in
    maxScale: 0,
    labelExpressionInfo: {
      expression: `$feature.areaname`
    },
    symbol: {
      type: "text",
      color: [0, 0, 100, 1],
      haloColor: [255, 255, 255, 0.9],
      haloSize: 1.5,
      font: { size: 9, weight: "bold" }
    },
    labelPlacement: "center-right"
  }
],
  featureReduction: clusterConfig,  // ✅ cluster renderer
  popupEnabled: true,
  popupTemplate: {
  title: "{areaname}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "pop2000", label: "Population (2000)", 
          format: { digitSeparator: true } },
        { fieldName: "capital", label: "State Capital" },
        { fieldName: "st", label: "State" }
      ]
    }
  ]
}
});

// Layer order — bottom to top
map.add(countiesLayer);
map.add(highwaysLayer);
map.add(citiesLayer);
map.add(statesLayer);  

// Store original cities renderer after layer loads
let originalCitiesRenderer = null;
citiesLayer.load().then(function() {
  originalCitiesRenderer = citiesLayer.renderer;
  console.log("Original renderer stored:", originalCitiesRenderer);
});

// ══════════════════════════════════════════════
// LAYER VIEW — created once, reused everywhere
// ══════════════════════════════════════════════
let statesLayerView = null;
let countiesLayerView = null;
let citiesLayerView = null;

view.whenLayerView(countiesLayer).then(function(layerView) {
  countiesLayerView = layerView;
  console.log("Counties LayerView ready!");
  console.log("Counties LayerView type:", layerView.type);
  console.log("Counties LayerView highlight:", typeof layerView.highlight);
});

view.whenLayerView(citiesLayer).then(function(layerView) {
  citiesLayerView = layerView;
  console.log("Cities LayerView ready!");
});

view.whenLayerView(statesLayer).then(function(layerView) {
  statesLayerView = layerView;
  console.log("LayerView ready!");
});
  // ══════════════════════════════════════════════
  // Graphics layer to hold sketch geometry
  // ══════════════════════════════════════════════
const sketchLayer = new GraphicsLayer({
  title: "Selection Graphics",
  id: "sketchLayer",
  listMode: "hide"  // hidden by default
});
map.add(sketchLayer);


  // ══════════════════════════════════════════════
  // WIDGETS
  // ══════════════════════════════════════════════
// LayerList with Legend underneath
const layerList = new LayerList({
  view: view,
  listItemCreatedFunction: function(event) {
    const item = event.item;
    item.panel = {
      content: "legend",  // shows legend inside each layer item
      open: false
    };
     // Give sketch layer a custom title when visible
    if (item.layer.id === "sketchLayer") {
      item.title = "Selection Graphics";
    }
  }
});

view.ui.add(layerList, "bottom-left");

  const homeWidget = new Home({ view: view });
  view.ui.add(homeWidget, "top-left");

 const sketch = new Sketch({
  view: view,
  layer: sketchLayer,
  availableCreateTools: ["point", "rectangle", "polygon", "circle"],
  creationMode: "single",
  visible: false  // hidden by default
});



const measurement = new Measurement({
  view: view,
  visible: false
});

const basemapGallery = new BasemapGallery({
  view: view,
  visible: false  // hidden by default
});
view.ui.add(basemapGallery, "top-right");

const navigationToggle = new NavigationToggle({
  view: view
});

view.ui.add(navigationToggle, "top-left");

  // ══════════════════════════════════════════════
  // STATE VARIABLES
  // ══════════════════════════════════════════════
  const resultsDiv = document.getElementById("results");
  let currentHighlight = null;
  let lastSelectedFeature = null;



  // ══════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ══════════════════════════════════════════════
  function showResults(features) {
  if (features.length === 0) {
    resultsDiv.innerHTML = "No results found";
    return;
  }
  let html = `<strong>Found ${features.length} result(s):</strong>
              <ul style="padding-left:18px; margin:8px 0;">`;
  features.forEach(feature => {
    const attrs = feature.attributes;
    html += `<li style="margin-bottom:6px;">
      <strong>${attrs.NAME}, ${attrs.STATE_NAME}</strong><br/>
      Population: ${attrs.POP2007 ? attrs.POP2007.toLocaleString() : 'N/A'}<br/>
      Density: ${attrs.POP07_SQMI ? attrs.POP07_SQMI.toFixed(1) : 'N/A'} per sq mile
    </li>`;
  });
  html += "</ul>";
  resultsDiv.innerHTML = html;
}

function highlightFeature(feature, targetLayerView) {
  if (!targetLayerView) { console.warn("No layerView!"); return; }
  if (currentHighlight) { currentHighlight.remove(); currentHighlight = null; }
  
  // Handle array of features — extract objectids
  if (Array.isArray(feature)) {
    const oids = feature.map(f => f.attributes.objectid || f.attributes.OBJECTID);
    currentHighlight = targetLayerView.highlight(oids);
  } else {
    // Single feature — extract objectid
    const oid = feature.attributes.objectid || feature.attributes.OBJECTID;
    currentHighlight = targetLayerView.highlight(oid);
  }
  console.log("Highlight set:", currentHighlight);
}

  // ══════════════════════════════════════════════
  // SIDEBAR — ATTRIBUTE QUERY
  // ══════════════════════════════════════════════
  document.getElementById("applyBtn").addEventListener("click", async function() {
  const searchValue = document.getElementById("stateInput").value.trim();

  if (searchValue === "") {
    resultsDiv.innerHTML = "Please enter a county or state name";
    return;
  }

  

  try {
    // First try state search
    const stateQuery = statesLayer.createQuery();
    stateQuery.where = `state_name = '${searchValue}'`;
    stateQuery.outFields = ["objectid", "state_name", "pop2000", "sub_region"];
    stateQuery.returnGeometry = true;

    const stateResult = await statesLayer.queryFeatures(stateQuery);

    // If state found — highlight state
    if (stateResult.features.length > 0) {
      lastSelectedFeature = stateResult.features[0];
      
      // Show state info in sidebar
      let html = `<strong>State: ${stateResult.features[0].attributes.state_name}</strong>
                  <ul style="padding-left:18px; margin:8px 0;">
                    <li>Population (2000): ${stateResult.features[0].attributes.pop2000.toLocaleString()}</li>
                    <li>Region: ${stateResult.features[0].attributes.sub_region}</li>
                  </ul>`;
      resultsDiv.innerHTML = html;

      await view.goTo(stateResult.features[0].geometry);
      highlightFeature(stateResult.features[0], statesLayerView);  // ✅ statesLayerView
      return;
    }

    // If no state found — try county search
    const countyQuery = countiesLayer.createQuery();
    countyQuery.where = `NAME = '${searchValue}'`;
    countyQuery.outFields = ["objectid", "NAME", "STATE_NAME", "POP2007", "POP07_SQMI"];
    countyQuery.returnGeometry = true;
    countyQuery.num =10;

    const countyResult = await countiesLayer.queryFeatures(countyQuery);

    console.log("County count:", countyResult.features.length);
console.log("First county:", countyResult.features[0]?.attributes);
console.log("countiesLayerView:", countiesLayerView);

    if (countyResult.features.length === 0) {
      resultsDiv.innerHTML = `No results found for "${searchValue}"`;
      return;
    }

   lastSelectedFeature = countyResult.features[0];
showResults(countyResult.features);

await view.goTo({
  target: countyResult.features.map(f => f.geometry)
});

// Highlight using objectids directly
const objectIds = countyResult.features.map(f => f.attributes.objectid);
console.log("Highlighting objectIds:", objectIds);

if (currentHighlight) { currentHighlight.remove(); currentHighlight = null; }
currentHighlight = countiesLayerView.highlight(objectIds);
console.log("Highlight by IDs:", currentHighlight); // ✅ wait 1 second for view to settle

  } catch (error) {
    resultsDiv.innerHTML = `Error: ${error.message}`;
    console.error("Query error:", error);
  }
});

  // Enter key triggers search
  document.getElementById("stateInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      document.getElementById("applyBtn").click();
    }
  });

  // ══════════════════════════════════════════════
  // MAP CLICK — SPATIAL QUERY
  // ══════════════════════════════════════════════
view.on("click", async function(event) {

  // IDENTIFY MODE
  if (identifyActive) {
    try {
      const response = await view.hitTest(event);
      const results = response.results.filter(
        r => r.graphic.layer !== sketchLayer
      );

      if (results.length === 0) {
        resultsDiv.innerHTML = "No features found at this location";
        return;
      }

      let html = `<strong>Identified ${results.length} feature(s):</strong>`;
      
      results.forEach(result => {
        const graphic = result.graphic;
        const layer = graphic.layer;
        const attrs = graphic.attributes;

        html += `<div style="margin-top:10px; padding:8px; 
                  background:#f4f4f4; border-radius:4px;
                  border-left: 3px solid #1F3864;">`;
        html += `<strong>${layer.title}</strong><br/>`;

        if (layer === countiesLayer) {
          html += `County: ${attrs.NAME}<br/>
                   State: ${attrs.STATE_NAME}<br/>
                   Population: ${attrs.POP2007 ? 
                     attrs.POP2007.toLocaleString() : 'N/A'}<br/>
                   Density: ${attrs.POP07_SQMI ? 
                     attrs.POP07_SQMI.toFixed(1) : 'N/A'} /sq mi`;
        } else if (layer === citiesLayer) {
          html += `City: ${attrs.areaname}<br/>
                   State: ${attrs.st}<br/>
                   Population: ${attrs.pop2000 ? 
                     attrs.pop2000.toLocaleString() : 'N/A'}`;
        } else if (layer === highwaysLayer) {
          html += `Route: ${attrs.route}<br/>
                   Type: ${attrs.type}`;
        } else if (layer === statesLayer) {
          html += `State: ${attrs.state_name}<br/>
                   Population: ${attrs.pop2000 ? 
                     attrs.pop2000.toLocaleString() : 'N/A'}`;
        }

        html += `</div>`;
      });

      resultsDiv.innerHTML = html;

    } catch (error) {
      console.error("Identify error:", error);
    }
    return;  // ✅ exit — don't run spatial query
  }

  // SPATIAL QUERY MODE
  try {
    const query = countiesLayer.createQuery();
    query.geometry = event.mapPoint;
    query.spatialRelationship = "intersects";
    query.outFields = ["objectid", "NAME", "STATE_NAME", 
                       "POP2007", "POP07_SQMI"];
    query.returnGeometry = true;
    query.num = 50;  // limit to 50 results

    const result = await countiesLayer.queryFeatures(query);

    if (result.features.length === 0) {
      resultsDiv.innerHTML = "No county found at this location";
      return;
    }

    lastSelectedFeature = result.features[0];
    showResults(result.features);
    highlightFeature(result.features[0], countiesLayerView);

  } catch (error) {
    console.error("Click query error:", error);
  }
});

  // ══════════════════════════════════════════════
  // TOOLBAR BUTTONS
  // ══════════════════════════════════════════════
// Distance and Area buttons — ONE handler
const measureButtons = document.querySelectorAll("#measureSubToolbar button");
// ONE handler for ALL sketch tool buttons using data-tool attribute
const sketchButtons = document.querySelectorAll("#selectSubToolbar button");

let identifyActive = false;
let measureActive = false;
let sketchActive = false;
let basemapActive = false;
let heatmapActive = false;

  //Zoom to selection
  document.getElementById("zoomToSelectionBtn").addEventListener("click", async function() {
    if (!lastSelectedFeature) {
      resultsDiv.innerHTML = "No feature selected yet";
      return;
    }
    await view.goTo(lastSelectedFeature.geometry);
  });

  // ══════════════════════════════════════════════
  // Clear Button
    // ══════════════════════════════════════════════

document.getElementById("clearBtn").addEventListener("click", async function() {
  // Remove highlight
  if (currentHighlight) {
    currentHighlight.remove();
    currentHighlight = null;
    console.log("Highlight removed");
  }

   // Clear sketch graphics
  sketchLayer.removeAll();
  sketchLayer.listMode = "hide";  // hide sketch graphics after clearing

  identifyActive = false;
document.getElementById("identityBtn").style.background = "#1F3864";

  view.closePopup();

// Reset heat map
if (heatmapActive) {
  citiesLayer.renderer = originalCitiesRenderer;  // ✅ restore original renderer
  citiesLayer.featureReduction = clusterConfig;   // ✅ restore clustering
  heatmapActive = false;
  document.getElementById("heatmapBtn").style.background = "#1F3864";
} else {
  // Heatmap was never on — make sure clustering is still set
  citiesLayer.featureReduction = clusterConfig;   // ✅ ensure clustering always on
  document.getElementById("heatmapBtn").style.background = "#1F3864";
}

  // Reset sketch button
  sketchActive = false;
  sketch.visible = false;
  document.getElementById("selectBtn").style.background = "#1F3864";

  // Clear measurement
measurement.clear();
measurement.visible = false;
measureActive = false;
document.getElementById("measureBtn").style.background = "#1F3864";
document.getElementById("measureSubToolbar").style.display = "none";
measureButtons.forEach(btn => btn.style.background = "#1F3864");

// Reset basemap button
basemapActive = false;
basemapGallery.visible = false;
document.getElementById("basemapBtn").style.background = "#1F3864";

// Clear proximity buffer
sketchLayer.removeAll();
sketchLayer.listMode = "hide";
document.getElementById("proximityDistance").value = "50";

  // Clear last selected feature
  lastSelectedFeature = null;

  // Clear search input
  document.getElementById("stateInput").value = "";

  // Reset results panel
  resultsDiv.innerHTML = "Results will appear here";

  // Zoom back to USA extent
 view.goTo({ extent: USA_EXTENT });
});


// ══════════════════════════════════════════════
// IDENTIFY TOOL
// ══════════════════════════════════════════════


document.getElementById("identityBtn").addEventListener("click", function() {
  identifyActive = !identifyActive;

  if (identifyActive) {
    this.style.background = "#E9A426";
    resultsDiv.innerHTML = "Click anywhere on map to identify features";
  } else {
    this.style.background = "#1F3864";
    resultsDiv.innerHTML = "Results will appear here";
  }
});

// ══════════════════════════════════════════════
// MEASURE TOOL
// ══════════════════════════════════════════════


// Toggle measure sub toolbar
document.getElementById("measureBtn").addEventListener("click", function() {
  const subToolbar = document.getElementById("measureSubToolbar");

  if (subToolbar.style.display === "flex") {
    // Hide sub toolbar
    subToolbar.style.display = "none";
    this.style.background = "#1F3864";
    measurement.clear();
    measurement.visible = false;
    measureActive = false;
    resultsDiv.innerHTML = "Results will appear here";
  } else {
    // Show sub toolbar
    subToolbar.style.display = "flex";
    this.style.background = "#E9A426";
    resultsDiv.innerHTML = "Choose Distance or Area to measure";
  }
});



measureButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    const measureType = this.getAttribute("data-measure");
    const unitValue = document.getElementById("unitSelect").value;

    measurement.visible = true;
    measureActive = true;

    if (measureType === "distance") {
      measurement.activeTool = "distance";
      // Only use distance units
      const distanceUnits = ["miles", "kilometers", "meters", "feet"];
      measurement.linearUnit = distanceUnits.includes(unitValue) 
        ? unitValue : "miles";
      resultsDiv.innerHTML = "Click points to measure distance. Double-click to finish.";

    } else if (measureType === "area") {
      measurement.activeTool = "area";
      // Only use area units
      const areaUnits = ["square-miles", "square-kilometers", 
                         "square-meters", "acres", "hectares"];
      measurement.areaUnit = areaUnits.includes(unitValue) 
        ? unitValue : "square-miles";
      resultsDiv.innerHTML = "Click points to measure area. Double-click to finish.";
    }

    measureButtons.forEach(btn => btn.style.background = "#1F3864");
    this.style.background = "#E9A426";
  });
});

// Unit change handler
document.getElementById("unitSelect").addEventListener("change", function() {
  const unit = this.value;
  if (!measureActive) return;

  const distanceUnits = ["miles", "kilometers", "meters", "feet"];
  const areaUnits = ["square-miles", "square-kilometers", 
                     "square-meters", "acres", "hectares"];

  if (measurement.activeTool === "distance" && distanceUnits.includes(unit)) {
    measurement.linearUnit = unit;
  } else if (measurement.activeTool === "area" && areaUnits.includes(unit)) {
    measurement.areaUnit = unit;
  }
});

// ══════════════════════════════════════════════
// SELECT TOOLS
// ══════════════════════════════════════════════


// Toggle sub toolbar on Select button click
document.getElementById("selectBtn").addEventListener("click", function() {
  const subToolbar = document.getElementById("selectSubToolbar");

  if (subToolbar.style.display === "flex") {
    // Hide sub toolbar
    subToolbar.style.display = "none";
    this.style.background = "#1F3864";
    sketch.cancel();
    sketch.visible = false;
    sketchActive = false;
    resultsDiv.innerHTML = "Results will appear here";
  } else {
    // Show sub toolbar
    subToolbar.style.display = "flex";
    this.style.background = "#E9A426";
    resultsDiv.innerHTML = "Choose a selection tool";
  }
});



sketchButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    const geometryType = this.getAttribute("data-tool");

    sketch.visible = true;
    sketch.create(geometryType);
    sketchActive = true;
    resultsDiv.innerHTML = `Draw a ${geometryType} to select states`;

    // Highlight active button — reset all first then highlight clicked
    sketchButtons.forEach(btn => btn.style.background = "#1F3864");
    this.style.background = "#E9A426";
  });
});

// When sketch is complete — query states inside drawn shape
sketch.on("create", async function(event) {
  if (event.state === "complete") {
    sketchLayer.listMode = "show";
    const geometry = event.graphic.geometry;

    try {
      const query = countiesLayer.createQuery();  // ✅ countiesLayer
      query.geometry = geometry;
      query.spatialRelationship = "intersects";
      query.outFields = ["objectid", "NAME", "STATE_NAME", "POP2007", "POP07_SQMI"];
      query.returnGeometry = true;

      const result = await countiesLayer.queryFeatures(query);  // ✅ countiesLayer

      if (result.features.length === 0) {
        resultsDiv.innerHTML = "No counties found in drawn area";
        return;
      }

      highlightFeature(result.features, countiesLayerView);  // ✅ countiesLayerView
      lastSelectedFeature = result.features[0];
      showResults(result.features);

      sketchActive = false;
      sketch.visible = false;
      document.getElementById("selectBtn").style.background = "#1F3864";
      document.getElementById("selectSubToolbar").style.display = "none";
      sketchButtons.forEach(btn => btn.style.background = "#1F3864");

    } catch (error) {
      console.error("Sketch query error:", error);
      resultsDiv.innerHTML = `Error: ${error.message}`;
    }
  }
});

// Basemap Gallery Button


document.getElementById("basemapBtn").addEventListener("click", function() {
  basemapActive = !basemapActive;
  console.log("Basemap active:", basemapActive);
  console.log("BasemapGallery:", basemapGallery);

  if (basemapActive) {
    basemapGallery.visible = true;
    this.style.background = "#E9A426";
  } else {
    basemapGallery.visible = false;
    this.style.background = "#1F3864";
  }
});

// ══════════════════════════════════════════════
// HEAT MAP TOGGLE
// ══════════════════════════════════════════════


// Heat map renderer
const heatmapRenderer = {
  type: "heatmap",
  colorStops: [
    { ratio: 0, color: "rgba(255, 255, 255, 0)" },
    { ratio: 0.2, color: "rgba(255, 255, 0, 0.8)" },
    { ratio: 0.4, color: "rgba(255, 165, 0, 0.9)" },
    { ratio: 0.6, color: "rgba(255, 69, 0, 0.9)" },
    { ratio: 0.8, color: "rgba(220, 0, 0, 1)" },
    { ratio: 1, color: "rgba(139, 0, 0, 1)" }
  ],
  maxDensity: 0.01,
  minDensity: 0
};

document.getElementById("heatmapBtn").addEventListener("click", function() {
  heatmapActive = !heatmapActive;

  if (heatmapActive) {
    // Switch to heat map
    citiesLayer.featureReduction = null;
    citiesLayer.renderer = heatmapRenderer;
    this.style.background = "#E9A426";
    resultsDiv.innerHTML = "Heat map showing city density";
  } else {
    // Switch back to clusters
    citiesLayer.renderer = originalCitiesRenderer;
    citiesLayer.featureReduction = clusterConfig;
    this.style.background = "#1F3864";
    resultsDiv.innerHTML = "Results will appear here";
  }
});

// ══════════════════════════════════════════════
// PROXIMITY ANALYSIS
// ══════════════════════════════════════════════
document.getElementById("proximityBtn").addEventListener("click", async function() {
  
  if (!lastSelectedFeature) {
    resultsDiv.innerHTML = "Please select a county first then click Find Nearby Cities";
    return;
  }

  const distance = document.getElementById("proximityDistance").value;
  
  if (!distance || distance <= 0) {
    resultsDiv.innerHTML = "Please enter a valid distance";
    return;
  }

  try {
    resultsDiv.innerHTML = "Searching for nearby cities...";

    // Create buffer around selected feature
    const buffer = geometryEngine.buffer(
      lastSelectedFeature.geometry,
      parseFloat(distance),
      "miles"
    );

    // Add buffer graphic to sketch layer
    sketchLayer.removeAll();
    const bufferGraphic = new Graphic({
      geometry: buffer,
      symbol: {
        type: "simple-fill",
        color: [0, 120, 255, 0.1],
        outline: {
          color: [0, 120, 255, 1],
          width: 2
        }
      }
    });
    sketchLayer.add(bufferGraphic);
    sketchLayer.listMode = "show";

    // Query cities within buffer
    const query = citiesLayer.createQuery();
    query.geometry = buffer;
    query.spatialRelationship = "intersects";
    query.outFields = ["areaname", "pop2000", "st"];
    query.returnGeometry = true;

    const result = await citiesLayer.queryFeatures(query);

    if (result.features.length === 0) {
      resultsDiv.innerHTML = `No cities found within ${distance} miles`;
      return;
    }

    // Show results
    let html = `<strong>Found ${result.features.length} cities within ${distance} miles:</strong>
                <ul style="padding-left:18px; margin:8px 0;">`;
    
    result.features.forEach(feature => {
      const attrs = feature.attributes;
      html += `<li style="margin-bottom:4px;">
        <strong>${attrs.areaname}</strong>, ${attrs.st}<br/>
        Population: ${attrs.pop2000 ? attrs.pop2000.toLocaleString() : 'N/A'}
      </li>`;
    });
    
    html += "</ul>";
    resultsDiv.innerHTML = html;

    // Zoom to buffer
    await view.goTo(buffer);

  } catch (error) {
    console.error("Proximity error:", error);
    resultsDiv.innerHTML = `Error: ${error.message}`;
  }
});

// ══════════════════════════════════════════════
// DYNAMIC RENDERER
// ══════════════════════════════════════════════

// Population Density renderer (current default)
const densityRenderer = {
  type: "class-breaks",
  field: "POP07_SQMI",
  classBreakInfos: [
    { minValue: 0, maxValue: 50, label: "< 50 per sq mile",
      symbol: { type: "simple-fill", color: [240, 228, 248, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 50, maxValue: 200, label: "50-200 per sq mile",
      symbol: { type: "simple-fill", color: [188, 143, 220, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 200, maxValue: 1000, label: "200-1000 per sq mile",
      symbol: { type: "simple-fill", color: [128, 0, 188, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 1000, maxValue: 999999999, label: "> 1000 per sq mile",
      symbol: { type: "simple-fill", color: [63, 0, 125, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } }
  ]
};

// Total Population renderer — blue
const populationRenderer = {
  type: "class-breaks",
  field: "POP2007",
  classBreakInfos: [
    { minValue: 0, maxValue: 25000, label: "< 25,000",
      symbol: { type: "simple-fill", color: [198, 219, 239, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 25000, maxValue: 100000, label: "25,000 - 100,000",
      symbol: { type: "simple-fill", color: [107, 174, 214, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 100000, maxValue: 500000, label: "100,000 - 500,000",
      symbol: { type: "simple-fill", color: [33, 113, 181, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 500000, maxValue: 999999999, label: "> 500,000",
      symbol: { type: "simple-fill", color: [8, 48, 107, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } }
  ]
};

// Median Age renderer — green
const ageRenderer = {
  type: "class-breaks",
  field: "MED_AGE",
  classBreakInfos: [
    { minValue: 0, maxValue: 30, label: "< 30 years",
      symbol: { type: "simple-fill", color: [199, 233, 192, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 30, maxValue: 37, label: "30 - 37 years",
      symbol: { type: "simple-fill", color: [116, 196, 118, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 37, maxValue: 45, label: "37 - 45 years",
      symbol: { type: "simple-fill", color: [35, 139, 69, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 45, maxValue: 999, label: "> 45 years",
      symbol: { type: "simple-fill", color: [0, 68, 27, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } }
  ]
};

// Households renderer — orange
const householdsRenderer = {
  type: "class-breaks",
  field: "HOUSEHOLDS",
  classBreakInfos: [
    { minValue: 0, maxValue: 10000, label: "< 10,000",
      symbol: { type: "simple-fill", color: [254, 230, 206, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 10000, maxValue: 50000, label: "10,000 - 50,000",
      symbol: { type: "simple-fill", color: [253, 174, 107, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 50000, maxValue: 200000, label: "50,000 - 200,000",
      symbol: { type: "simple-fill", color: [230, 85, 13, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } },
    { minValue: 200000, maxValue: 999999999, label: "> 200,000",
      symbol: { type: "simple-fill", color: [127, 39, 4, 0.5],
        outline: { color: [200, 200, 200, 0.3], width: 0.3 } } }
  ]
};

// Dropdown change handler
document.getElementById("rendererSelect").addEventListener("change", function() {
  const selected = this.value;

  if (selected === "density") {
    countiesLayer.renderer = densityRenderer;
    resultsDiv.innerHTML = "Showing: Population Density";
  } else if (selected === "population") {
    countiesLayer.renderer = populationRenderer;
    resultsDiv.innerHTML = "Showing: Total Population";
  } else if (selected === "age") {
    countiesLayer.renderer = ageRenderer;
    resultsDiv.innerHTML = "Showing: Median Age";
  } else if (selected === "households") {
    countiesLayer.renderer = householdsRenderer;
    resultsDiv.innerHTML = "Showing: Households";
  }
});

});