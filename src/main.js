"use strict";

const DEFAULT_LAT = -25.344490;
const DEFAULT_LNG = 131.035431;
const DEFAULT_ZOOM = 4;
const DEFAULT_MARKER_RADIUS = 50000;

//trying not to expose anything.
(function () {

	//-----------------------
	// Properties
	//-----------------------

	// trying to store the json info when region/subregion is clicked on
	let currentRegionInfo;
	// holding all the formatted region data
	let regionJson;
	// holding the json data for subregions
	let subregionJson;
	// if region is isolated turns to true and disbales the layers being added with zoom control
	var disablezoomlayer = false;

	//control for the not isolated layers
	var otherlayer;
	//controll for the isolated region
	var selectedLayer;
	// boolean to tell if a subregion is isolated
	var isolatedsubregion = false;
	// all the layers for drawing
	// CAN this be modified to control patterns
	var editableLayers = new L.FeatureGroup();

	//-----------------------------------------------------


	// get the json storing the region info and store in regionjson
	function getRegions() {
		sendRequest({ method: "GET", url: 'https://www.greenprints.org.au/map-app/regions.json' })
			.then((data) => {
				regionJson = data
			});
		sendRequest({ method: "GET", url: 'https://www.greenprints.org.au/map-app/subregions.json' })
			.then((data) => {
				subregionJson = data
			});
	}


	let {
		sendRequest,
		sendRequests
	} = require("./utils.js");


	/**
	 * Initialize state.
	 */
	function main() {
		this.isInitialized = false;
		this.defaultStyle = {
			fillColor: "#3388ff"// blue
		}
		/* toggle which regions are shown on load 
		warning change check boxes to match the these.
		*/
		this.alwaysShowBioregions = false;
		this.alwaysShowSubBioregions = false;
		this.hideBioregions = false;
		this.hideSubBioregions = false;
		this.data = {};
		this.detailElement = document.getElementById("subregion-detail");
		this.regionDetailModal = document.getElementById("region-detail-modal");
		this.regionDetailBody = document.getElementById("region-detail-body");
		this.regionDetailTitle = document.getElementById("region-detail-title");
		this.regionDetailBodyAccordion = document.getElementById("accordion");
		this.regionLoading = document.getElementById("region-loading");

		// Details for the isolate button.
		this.isolate = document.createElement("button");
		this.isolate.id = "isolate-button";
		this.isolate.classList.add("btn", "btn-info");
		this.isolate.innerHTML = "Isolate region";

		// Details for the subisolate button.
		this.subisolate = document.createElement("button");
		this.subisolate.id = "isolate-button";
		this.subisolate.classList.add("btn", "btn-info");
		this.subisolate.innerHTML = "Isolate Subregion";

		//Details for the undo button.
		this.undo = document.createElement("button");
		this.undo.id = "undo-button";
		this.undo.classList.add("btn", "btn-info");
		this.undo.innerHTML = "Undo";

		// the style of the isolated bioregion
		function isolatedStyle(feature) {
			return {
				fillColor: "#ffffff", // white
				fillOpacity: 0, //change to 0 when isolaitng is comepleted
				//border color
				color: '#000000', // black
			};
		}
		// style for the un-isolated regions
		function backgroundStyle(feature) {
			return {
				fillColor: "#737373", // grey
				fillOpacity: .7,
				color: '#000000', // black
			}
		}

		// event for undo button 
		this.undo.addEventListener("click", () => {
			// these allow the undo button to be hit multiple times and not have
			// your computer completely melt
			this.map.removeLayer(this.otherlayer);
			this.map.removeLayer(this.selectedLayer);
			this.map.removeLayer(this.regions);
			this.map.removeLayer(this.subregions);
			this.map.removeLayer(this.subregions_simple);

			// enable the layers showing on zoom
			disablezoomlayer = false;

			this.removeMarker();
			// reinitialise the map


			this.initCarto();

		})

		//------------------
		// SUBISOLATE
		//------------------
		//difference in simplified subregion and subregions is color??
		// event that triggers when isolate button is clicked for subregions
		this.subisolate.addEventListener("click", () => {
			// removes all the bioregions from the map
			this.map.removeLayer(this.regions);

			//remove all subregions from map when isolating bioregion
			this.map.removeLayer(this.subregions)
			this.map.removeLayer(this.subregions_simple)

			// removes an already selected layer
			if (this.selectedLayer != null) {
				this.map.removeLayer(this.selectedLayer)
			}

			// removes the other subregions if a target is already isolated
			if (typeof this.otherlayer !== 'undefined') {
				this.map.removeLayer(this.otherlayer);
			}

			this.selectedLayer = L.geoJSON(currentRegionInfo, {
				style: isolatedStyle,
				onEachFeature: this.isolatedFeature.bind(this),
			});

			this.selectedLayer.addTo(this.map);


			this.otherlayer = L.geoJson(JSON.parse(subregionJson), {
				style: backgroundStyle,
				onEachFeature: this.onEachFeatureSubRegions.bind(this),
			});

			// getting the name of the isolated layer
			let removesubName;
			// the id of the layer to be removed
			let othersubLayerId;

			this.selectedLayer.eachLayer(function (layer) {
				removesubName = layer.feature.properties.sub_n
			});

			// removing the isolated layer from the other layers
			this.otherlayer.eachLayer(function (layer) {
				if (layer.feature.properties.sub_n == removesubName) {
					// getting the id of the layer
					othersubLayerId = layer._leaflet_id;
				}
			});
			// remove the layer with with the id from the un-isolated areas
			this.otherlayer.removeLayer(othersubLayerId);

			// add the selected bioregion to the map
			this.otherlayer.addTo(this.map);

			//remove the marker
			this.removeMarker();
			// disable the automatic layers for zoom
			disablezoomlayer = true;

			if (editableLayers) {
				editableLayers.bringToFront();
			}
		})

		//------------------
		// ISOLATE
		//------------------
		// Function that is run when button is pressed 
		this.isolate.addEventListener("click", () => {

			// removes all the bioregions from the map
			this.map.removeLayer(this.regions);

			//remove all subregions from map when isolating bioregion
			this.map.removeLayer(this.subregions)
			this.map.removeLayer(this.subregions_simple)


			// remove an already selected layer
			// this could be modified to allow multiple isolations but that requires
			// a resturctuing of how the data is loaded onto the map
			if (this.selectedLayer != null) {
				this.map.removeLayer(this.selectedLayer)
			}

			//check if other layers have been added to the map
			if (typeof this.otherlayer !== 'undefined') {
				this.map.removeLayer(this.otherlayer);
			}


			// Creating a new layer with the information about the selected bioregion
			this.selectedLayer = L.geoJSON(currentRegionInfo, {
				style: isolatedStyle,
				// look at isolated feature make a new one called subisolatedfeatue and add the details for that
				onEachFeature: this.isolatedFeature.bind(this),
			});

			// setting the interaction for un-isolated region
			this.otherlayer = L.geoJson(JSON.parse(regionJson), {
				style: backgroundStyle,
				onEachFeature: this.onEachFeatureRegions.bind(this),
			});

			// getting the name of the isolated layer
			let removeName;
			// the id of the layer to be removed
			let otherLayerId;
			this.selectedLayer.eachLayer(function (layer) {
				removeName = layer.feature.properties.n
			});

			// removing the isolated layer from the other layers
			this.otherlayer.eachLayer(function (layer) {
				if (layer.feature.properties.n == removeName) {
					// getting the id of the layer
					otherLayerId = layer._leaflet_id;
				}
			});
			// remove the layer with with the id from the un-isolated areas
			this.otherlayer.removeLayer(otherLayerId);

			// add the selected bioregion to the map
			this.otherlayer.addTo(this.map);

			//add the isolated region to the map
			this.selectedLayer.addTo(this.map);

			// remove the marker
			this.removeMarker();
			// disable the automatic zoom controls
			disablezoomlayer = true;

			if (editableLayers) {
				editableLayers.bringToFront();
			}
		});

		// get the json for all regions
		getRegions();
		//end of main
	}

	/**
	 * Initialize state.
	 */
	main.prototype.init = function () {
		if (this.isInitialized) return;
		this.initMap();
		this.initEvents();
		this.initCarto();
		this.drawingControl();
		// this.printControl();


		// this.initData();

		this.isInitialized = true;
		this.zoomedIn = false;
		this.currentZoom = DEFAULT_ZOOM
		// this controlls which boxes are ticked at the start but no functionality
		document.getElementById("show-bioregions").checked = false;
		document.getElementById("show-subregions").checked = false;
		document.getElementById("hide-bioregions").checked = false;
		document.getElementById("hide-subregions").checked = false;
	}


	/**
	 * Initialize map.
	 * 
	 */
	main.prototype.initMap = function () {
		// draw control false diasbles the automatic addition of drawing tool
		this.map = L.map('mapid', { drawControl: false }).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
		this.zoomLevels = {
			start: this.map.getZoom(),
			end: this.map.getZoom()
		}

		var defaultLayer = L.tileLayer.provider('OpenStreetMap.Mapnik').addTo(this.map);

		/**
		 * ref: https://github.com/leaflet-extras/leaflet-providers
		 *
		 *  these layers are from ../leaflet-providers
		 */

		let baseLayers = {
			'OpenStreetMap Default': defaultLayer,
			'Esri WorldStreetMap': L.tileLayer.provider('Esri.WorldStreetMap'),
			'Esri WorldImagery': L.tileLayer.provider('Esri.WorldImagery'),
			'Esri DeLorme': L.tileLayer.provider('Esri.DeLorme'),
			'Esri WorldTopoMap': L.tileLayer.provider('Esri.WorldTopoMap'),
			'Esri WorldTerrain': L.tileLayer.provider('Esri.WorldTerrain'),
			'Esri WorldShadedRelief': L.tileLayer.provider('Esri.WorldShadedRelief'),
			'Esri WorldPhysical': L.tileLayer.provider('Esri.WorldPhysical'),
			'Esri OceanBasemap': L.tileLayer.provider('Esri.OceanBasemap'),
			'Esri NatGeoWorldMap': L.tileLayer.provider('Esri.NatGeoWorldMap'),
			'Esri WorldGrayCanvas': L.tileLayer.provider('Esri.WorldGrayCanvas'),
			"NASAGIBS": L.tileLayer.provider('NASAGIBS.ViirsEarthAtNight2012'),
			'OpenStreetMap Black and White': L.tileLayer.provider('OpenStreetMap.BlackAndWhite'),
			'OpenStreetMap H.O.T.': L.tileLayer.provider('OpenStreetMap.HOT'),
			'Stamen Toner': L.tileLayer.provider('Stamen.Toner'),
			'Stamen Terrain': L.tileLayer.provider('Stamen.Terrain'),
			'Stamen Watercolor': L.tileLayer.provider('Stamen.Watercolor'),
			'thunderforest Spinalmap': L.tileLayer.provider('Thunderforest.SpinalMap')
		}

		let overlayLayers = {}

		L.control.layers(baseLayers, overlayLayers, { collapsed: true, position: 'bottomright' }).addTo(this.map);

		//search function
		let searchCtlOption = {
			url: 'https://nominatim.openstreetmap.org/search?format=json&q={s}',
			jsonpParam: 'json_callback',
			propertyName: 'display_name',
			propertyLoc: ['lat', 'lon'],
			marker: L.marker([0, 0]),
			autoCollapse: true,
			autoType: false,
			minLength: 2,
			zoom: 10
		};

		L.control.locate({ flyTo: false, keepCurrentZoomLevel: true }).addTo(this.map);

		L.easyButton('fa-expand', (btn, map) => {
			this.fullscreen();
		}).addTo(this.map);

		let searchControl = new L.Control.Search(searchCtlOption);

		this.map.addControl(searchControl);

		// end of init map
	}

	//handler for geojson data. Randomize colors
	main.prototype.handleGeoJson = function (data, onEachFeature, style) {
		return new Promise((res, rej) => {
			res(
				L.geoJson(JSON.parse(data), {
					onEachFeature: onEachFeature,
					style: (feature) => {
						return Object.assign(style ? style : {}, {
							fillColor: `rgb(${feature.properties.rgb[0]}, ${feature.properties.rgb[1]}, ${feature.properties.rgb[2]})`
						})
					}
				})
			)
		})
	}



	main.prototype.isolatedFeature = function (feature, layer) {
		layer.on({
			click: (e) => {
				this.currentRegionName = e.target.feature.properties.n;
				this.detailElement.innerHTML = '<strong>Bioregion: </strong>' + this.currentRegionName + '<hr/>';

				if (this.currentSubRegionName) {
					this.detailElement.innerHTML += '<strong>Sub-bioregion: </strong>' + this.currentSubRegionName + '<hr/>';
					isolatedsubregion = true;
				}

				// remove any markers on the map
				if (this.marker != undefined) {
					this.map.removeLayer(this.marker);
				}

				if (isolatedsubregion == true) {
					this.marker = L.marker(e.latlng).addTo(this.map);
					this.marker.bindPopup(this.undo).openPopup();
				} else {
					this.marker = L.marker(e.latlng).addTo(this.map);
					this.marker.bindPopup(this.undo).openPopup();
				}

				//#region Get information about the bioregion should be put in function but doing so breaks functionality
				//Get information from posts about bioregions

				var titlePostRegion = this.currentRegionName.replace(/ /g, "-");
				if (this.currentSubRegionName) {
					titlePostRegion = this.currentSubRegionName.replace(/ /g, "-");
				}

				// the region selected was a bio region 
				let url = 'https://www.greenprints.org.au/wp-json/wp/v2/posts?categories=39&slug=' + titlePostRegion;

				if (!this.data[titlePostRegion]) this.data[titlePostRegion] = {};
				if (this.data[titlePostRegion].loading == true) return;

				if (this.data[titlePostRegion].data) {
					this.detailElement.innerHTML += this.data[titlePostRegion].data
				} else {
					this.data[titlePostRegion].loading = true;
					sendRequest({ method: 'GET', url })
						.then((result) => {
							let data = JSON.parse(result);
							if (!data.length) {
								this.detailElement.innerHTML += '<p>This region currently has no information. You can add information about this bioregion <a href="/submit-bioregions">here</a>.</p>'
							} else {
								this.data[titlePostRegion].data = data[0].content.rendered;
								this.detailElement.innerHTML += this.data[titlePostRegion].data
							}
							url = ''

							this.data[titlePostRegion].loading = false;
						}, () => {
							this.data[titlePostRegion].loading = false;
						})
				}
			}
			//#endregion
		}
		)
	}



	//Handler for click events for each feature in geojson layer (Regions)
	// also gets the region info this has to change fro new region info
	main.prototype.onEachFeatureRegions = function (feature, layer) {
		layer.on({
			click: (e) => {
				currentRegionInfo = e.target.feature
				this.currentRegionName = e.target.feature.properties.n;
				this.detailElement.innerHTML = '<strong>Bioregion: </strong>' + this.currentRegionName + '<hr/>';

				if (this.marker != undefined) {
					this.map.removeLayer(this.marker);
				}

				this.marker = L.marker(e.latlng).addTo(this.map);
				this.marker.bindPopup(this.isolate).openPopup();

				//Get information from posts about bioregions
				var titlePostRegion = this.currentRegionName.replace(/ /g, "-");
				(titlePostRegion)
				let url = 'https://www.greenprints.org.au/wp-json/wp/v2/posts?categories=39&slug=' + titlePostRegion;

				if (!this.data[titlePostRegion]) this.data[titlePostRegion] = {};
				if (this.data[titlePostRegion].loading == true) return;

				if (this.data[titlePostRegion].data) {
					this.detailElement.innerHTML += this.data[titlePostRegion].data
				} else {
					this.data[titlePostRegion].loading = true;
					(url);
					sendRequest({ method: 'GET', url })
						.then((result) => {
							let data = JSON.parse(result);
							if (!data.length) {
								this.detailElement.innerHTML += '<p>This region currently has no information. You can add information about this bioregion <a href="/submit-bioregions">here</a>.</p>'
							} else {
								this.data[titlePostRegion].data = data[0].content.rendered;
								this.detailElement.innerHTML += this.data[titlePostRegion].data
							}
							url = ''

							this.data[titlePostRegion].loading = false;
						}, () => {
							this.data[titlePostRegion].loading = false;
						})
				}
			}
		});
	}

	//Handler for click events for each feature in geojson layer (Sub-regions)
	main.prototype.onEachFeatureSubRegions = function (feature, layer) {
		layer.on({

			click: (e) => {
				currentRegionInfo = e.target.feature
				this.currentRegionName = e.target.feature.properties.n;
				this.currentSubRegionName = e.target.feature.properties.sub_n;
				this.detailElement.innerHTML = '<strong>Bioregion: </strong>' + this.currentRegionName + '<hr/>';


				if (this.currentSubRegionName) {
					this.detailElement.innerHTML += '<strong>Sub-bioregion: </strong>' + this.currentSubRegionName + '<hr/>';
				}
				if (this.marker != undefined) {
					this.map.removeLayer(this.marker);
				}

				this.marker = L.marker(e.latlng).addTo(this.map);
				this.marker.bindPopup(this.subisolate).openPopup();

				//Get information from posts about subbioregions
				var subregiontitle = this.currentSubRegionName.replace(/ /g, '-')
				let url = ''
				if (subregiontitle !== '') {
					("Subregioned")
					url = 'https://www.greenprints.org.au/wp-json/wp/v2/posts?categories=39&slug=' + subregiontitle;
					(url)
				}
				if (!this.data[subregiontitle]) this.data[subregiontitle] = {};
				if (this.data[subregiontitle].loading == true) return;

				if (this.data[subregiontitle].data) {
					this.detailElement.innerHTML += this.data[subregiontitle].data
				} else {
					this.data[subregiontitle].loading = true;

					sendRequest({ method: 'GET', url })
						.then((result) => {
							let data = JSON.parse(result);
							if (!data.length) {
								this.detailElement.innerHTML += '<p>This region currently has no information. You can add information about this bioregion <a href="/submit-bioregions">here</a>.</p>'
							} else {
								this.data[subregiontitle].data = data[0].content.rendered;
								this.detailElement.innerHTML += this.data[subregiontitle].data
							}
							this.data[subregiontitle].loading = false;

						}, () => {
							this.data[subregiontitle].loading = false;
						})
				}

			}
		});
	}

	//Get geojson for the layers
	main.prototype.initCarto = function () {
		//Add Regions layer
		this.currentZoom = this.map.getZoom();
		(this.currentZoom);
		sendRequest({ method: "GET", url: 'https://www.greenprints.org.au/map-app/regions.json' })
			.then((data) => this.handleGeoJson(data, this.onEachFeatureRegions.bind(this), {
				color: '#333',
				weight: 1.5,
				opacity: 1,
				fillOpacity: 0.4
			}))
			.then((layer) => {
				this.regions = layer;
				// checks the current zoom of the map or if user always wants to show bioregions
				if (this.currentZoom <= 6 || this.alwaysShowBioregions == true) {
					// if mapped zoomed out enough check if user want to hide bioregions
					if (this.hideBioregions == false) {
						this.regions.addTo(this.map)
					}
				}
			})

		//Add Subregions layer and setting visibility depending on zoom level
		sendRequest({ method: "GET", url: 'https://www.greenprints.org.au/map-app/subregions_simplified.json' })
			.then((data) => this.handleGeoJson(data, this.onEachFeatureSubRegions.bind(this), {
				color: '#333',
				weight: 1,
				opacity: 0.5,
				fillOpacity: 0.2
			}))
			.then((layer) => {
				this.subregions_simple = layer;
				// This activate on a zoom control
				if (this.hideSubBioregions) {
					("hide bioregions")
				} else {
					if (this.currentZoom > 6) {
						this.subregions_simple.addTo(this.map)
					}
					this.map.on('zoomend', (e) => {
						this.currentZoom = this.map.getZoom();
						if (this.currentZoom > 6 && disablezoomlayer == false) {
							if (!this.alwaysShowBioregions) {
								this.map.removeLayer(this.regions);
							}
							if (!this.hideSubBioregions) {
								// the question mark operatior is a short way for if else statment
								// aka if this.subregions_simple exists add it to map else add subregions to map
								this.subregions_simple ? this.subregions_simple.addTo(this.map) : this.subregions.addTo(this.map)
							}
						} else {
							if (!this.alwaysShowSubBioregions) {
								this.subregions_simple ? this.map.removeLayer(this.subregions_simple) : this.map.removeLayer(this.subregions)
							}
							if (!this.hideBioregions && disablezoomlayer == false) {
								this.regions.addTo(this.map);
							}

						}
					})
					if (this.alwaysShowSubBioregions) {
						this.subregions_simple.addTo(this.map);
					}
				}
			})


		//Subregions layer with names of subregions
		sendRequest({ method: "GET", url: 'https://www.greenprints.org.au/map-app/subregions.json' })
			.then((data) => this.handleGeoJson(data, this.onEachFeatureSubRegions.bind(this), {
				color: '#333',
				weight: 1,
				opacity: 0.5,
				fillOpacity: 0.2
			}))
			.then((layer) => {
				this.subregions = layer;
				('detailed subregions loaded')
				if (this.alwaysShowSubBioregions) this.subregions.addTo(this.map);
			})

		if (editableLayers) {
			editableLayers.bringToFront();
		}
	}

	//add event listeners for html DOM elements.
	//these buttons control the functionality for the checkbox to load and hide bioregions
	main.prototype.initEvents = function () {
		document.getElementById("panel-toggle").addEventListener("click", this.panelOpen.bind(this));
		document.getElementById("modal-close-button").addEventListener("click", this.toggleModal.bind(this));
		document.getElementById("show-bioregions").addEventListener("click", this.toggleBioregion.bind(this));
		document.getElementById("show-subregions").addEventListener("click", this.toggleSubBioregion.bind(this));
		document.getElementById("hide-bioregions").addEventListener("click", this.hideBioregion.bind(this));
		document.getElementById("hide-subregions").addEventListener("click", this.hideSubBioregion.bind(this));
		// drawing tool controll
		// document.getElementById("Drawing-toggle").addEventListener("click", this.drawingOpen.bind(this));
	}




	//fullscreen styling 
	main.prototype.fullscreen = function () {
		let container = document.getElementsByClassName("container-flex")[0];
		let mapdiv = document.getElementById("mapid")
		let infoDisplay = document.getElementsByClassName("information-display")[0];
		let panelSide = document.getElementById("panel-side");

		/Android|webOS|iPhone|iPad|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent) ?
			(() => {
				container = document.getElementsByClassName("panel-container")[0];
				if (this.isFullScreen) {
					container.style.position = 'relative';
					container.style.width = '100%';
					container.style.height = '100%';
					mapdiv.style.height = '100%';
					panelSide.style.height = "100%";
				} else {
					container.style.position = "fixed";
					container.style.top = 0;
					container.style.bottom = 0;
					container.style.right = 0;
					container.style.left = 0;
					mapdiv.style.height = "100%";
					panelSide.style.height = "100%";
				}
			})() :
			(() => {
				if (this.isFullScreen) {
					container.style.position = 'relative';
					container.style.width = '100%';
					container.style.height = '100%';
					mapdiv.style.height = '70%';
					infoDisplay.style.height = "70%";
					panelSide.style.height = "70%";
				} else {
					container.style.position = "fixed";
					container.style.top = 0;
					container.style.bottom = 0;
					container.style.right = 0;
					container.style.left = 0;

					mapdiv.style.height = "100%";
					infoDisplay.style.height = "100%";

					panelSide.style.height = "100%";
				}
			})()
		this.map.invalidateSize();
		this.isFullScreen = !this.isFullScreen
		this.map.setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
	}

	//Toggle layer select panel
	main.prototype.panelOpen = function () {
		//Probably store these as states.
		let toggle = document.getElementById("panel-toggle");
		let panel = document.getElementById("panel-side");
		if (toggle.className == "panel-toggle") {
			toggle.className = "panel-toggle-close"
			panel.style.display = "block"
		} else {
			toggle.className = "panel-toggle";
			panel.style.display = "none"
		}
	}

	main.prototype.toggleModal = function () {
		if (this.regionDetailModal.classList.contains("show")) {
			this.regionDetailModal.classList.remove("show");
			this.regionDetailModal.style.display = "none";
			this.regionDetailBodyAccordion.innerHTML = ''
		} else {
			this.regionDetailModal.classList.add("show");
			this.regionDetailModal.style.display = "block";
		}
	}

	//toggle function that gets called from each toggle
	main.prototype.toggleLayer = function () {
		if (!this.regions || (!this.subregions_simple && !this.subregion)) return;
		// (`alwaysShowSubBioregions: ${this.alwaysShowSubBioregions}`)
		// (`alwaysShowBioregions: ${this.alwaysShowBiorsegions}`)
		if (this.alwaysShowSubBioregions) this.subregions_simple ? this.subregions_simple.addTo(this.map) : this.subregions.addTo(this.map);
		if (this.alwaysShowBioregions) this.regions.addTo(this.map);
		if (!this.alwaysShowSubBioregions && this.currentZoom <= 6) this.map.removeLayer(this.subregions_simple ? this.subregions_simple : this.subregions);
		if (!this.alwaysShowBioregions && this.currentZoom > 6) this.map.removeLayer(this.regions);
	}
	//always show region toggle
	main.prototype.toggleBioregion = function () {
		this.alwaysShowBioregions = !this.alwaysShowBioregions;
		this.toggleLayer();
	}
	//allways show subregion toggle
	main.prototype.toggleSubBioregion = function () {
		this.alwaysShowSubBioregions = !this.alwaysShowSubBioregions;
		this.toggleLayer();
	}
	//hide regions toggle
	main.prototype.hideBioregion = function () {
		this.hideBioregions = !this.hideBioregions;
		if (this.hideBioregions) {
			this.map.removeLayer(this.regions);
		} else if (this.currentZoom <= 6 || this.alwaysShowBioregions) {
			this.regions.addTo(this.map);
		}
	}
	//hide subregion toggle
	main.prototype.hideSubBioregion = function () {
		this.hideSubBioregions = !this.hideSubBioregions;
		if (this.hideSubBioregions) {
			this.map.removeLayer(this.subregions_simple ? this.subregions_simple : this.subregions)
		} else if (this.currentZoom > 6 || this.alwaysShowSubBioregions) {
			this.subregions_simple ? this.subregions_simple.addTo(this.map) : this.subregions.addTo(this.map)
		}
	}
	// function to remove the marker from the map
	main.prototype.removeMarker = function () {
		if (this.marker != undefined) {
			this.map.removeLayer(this.marker);
		}
	}

	// main.prototype.printControl = function () {
	// 	var printProvider = this.L.print.provider({
	// 		method: 'GET',
	// 		url: ' http://path/to/mapfish/print',
	// 		autoLoad: true,
	// 		dpi: 90
	// 	});

	// 	var printControl = L.control.print({
	// 		provider: printProvider
	// 	});


	// 	this.map.addControl(printControl);
	// }



	main.prototype.drawingControl = function () {
		//------------------
		// Draw control
		//------------------

		// var editableLayers = new L.FeatureGroup();
		// Add editable layers to the map
		this.map.addLayer(editableLayers);

		// set the options for each drawing toolbar
		var natureconservationcolor = "#936bc4" // Purple
		var natureconservationoptions = {
			position: 'bottomleft',
			draw: {
				polygon: {
					// allowIntersection: false, // Restricts shapes to simple polygons
					// drawError: {
					// 	color: '#0BE100 ', // Color the shape will turn when intersects
					// },
					shapeOptions: {
						color: natureconservationcolor
					}
				},
				polyline: false,
				circle: false, // Turns off this drawing tool
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
				// remove: true
			}
		};
		var Other_protected_areas_color = '#c5c1fe' // light purple
		var Other_protected_areas_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: Other_protected_areas_color,
						showArea: true
					}
				},
				polyline: false,
				circle: false, // Turns off this drawing tool
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Minimal_use_color = '#dd87de' // purple/pinkish
		var Minimal_use_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: Minimal_use_color,
						showArea: true
					}
				},
				polyline: false,
				circle: false, // Turns off this drawing tool
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Grazing_native_vegetation_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#fffbe7",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Production_forestry_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#31874a",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers,
			}
		};
		var Grazing_modified_pastures_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#fed082",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers,
			}
		};
		var Plantation_forestry_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#abfdb3",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Dryland_cropping_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#fdfa31",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Dryland_horticulture_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#ac867b",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Land_in_transition_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#000000",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Irrigate_pastures_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#fda621",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Irrigate_cropping_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#c9b45b",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Urban_intensive_uses_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#fe000d",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Intensive_production_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#ffc6bf",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Rural_residential_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#b1b1b1",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Mining_and_waste_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#48808d",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};
		var Water_options = {
			position: 'bottomleft',
			draw: {
				polygon: {
					shapeOptions: {
						color: "#022cfc",
						showArea: true
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				remove: true,
				circlemarker: false
			},
			edit: {
				featureGroup: editableLayers, //REQUIRED!!
			}
		};

		// create the toolbar with the assigned option
		var natureconservationcontrol = new L.Control.Draw(natureconservationoptions);
		var Other_protected_areas_control = new L.Control.Draw(Other_protected_areas_options);
		var Minimal_use_control = new L.Control.Draw(Minimal_use_options);
		var Grazing_native_vegetation_control = new L.Control.Draw(Grazing_native_vegetation_options);
		var Production_forestry_control = new L.Control.Draw(Production_forestry_options);
		var Grazing_modified_pastures_control = new L.Control.Draw(Grazing_modified_pastures_options);
		var Plantation_forestry_control = new L.Control.Draw(Plantation_forestry_options);
		var Dryland_cropping_control = new L.Control.Draw(Dryland_cropping_options);
		var Dryland_horticulture_control = new L.Control.Draw(Dryland_horticulture_options);
		var Land_in_transition_control = new L.Control.Draw(Land_in_transition_options);
		var Irrigate_pastures_control = new L.Control.Draw(Irrigate_pastures_options);
		var Irrigate_cropping_control = new L.Control.Draw(Irrigate_cropping_options);
		var Urban_intensive_uses_control = new L.Control.Draw(Urban_intensive_uses_options);
		var Intensive_production_control = new L.Control.Draw(Intensive_production_options);
		var Rural_residential_control = new L.Control.Draw(Rural_residential_options);
		var Mining_and_waste_control = new L.Control.Draw(Mining_and_waste_options);
		var Water_control = new L.Control.Draw(Water_options);

		// get correct refrence to this.map to use in functions if this is removed cannot get correct refrence to map
		var mapper = this.map

		//create function to delete all toolbars
		var controls = [
			natureconservationcontrol, Other_protected_areas_control,
			Minimal_use_control, Grazing_native_vegetation_control,
			Production_forestry_control, Grazing_modified_pastures_control,
			Plantation_forestry_control, Dryland_cropping_control,
			Dryland_horticulture_control, Land_in_transition_control,
			Irrigate_pastures_control, Irrigate_cropping_control,
			Urban_intensive_uses_control, Intensive_production_control,
			Rural_residential_control, Mining_and_waste_control,
			Water_control
		];

		function deletetoolbars() {
			for (var i = 0; i < controls.length; i++) {
				mapper.removeControl(controls[i]);
			}
		}

		//drawing selector 
		var sel = document.getElementById('Selector');
		var selected = sel.value

		sel.onchange = function () {
			selected = sel.value;
			switch (selected) {
				case "DrawingNone":
					deletetoolbars();
					break;
				case "Nature_conservation":
					deletetoolbars();
					mapper.addControl(natureconservationcontrol);
					break;
				case "Other_protected_areas":
					deletetoolbars();
					mapper.addControl(Other_protected_areas_control);
					break;
				case "Minimal_use":
					deletetoolbars();
					mapper.addControl(Minimal_use_control);
					break;
				case "Grazing_native_vegetation":
					deletetoolbars();
					mapper.addControl(Grazing_native_vegetation_control);
					break;
				case "Production_forestry":
					deletetoolbars();
					mapper.addControl(Production_forestry_control);
					break;
				case "Grazing_modified_pastures":
					deletetoolbars();
					mapper.addControl(Grazing_modified_pastures_control);
					break;
				case "Plantation_forestry":
					deletetoolbars();
					mapper.addControl(Plantation_forestry_control);
					break;
				case "Dryland_cropping":
					deletetoolbars();
					mapper.addControl(Dryland_cropping_control);
					break;
				case "Dryland_horticulture":
					deletetoolbars();
					mapper.addControl(Dryland_horticulture_control);
					break;
				case "Land_in_transition":
					deletetoolbars();
					mapper.addControl(Land_in_transition_control);
					break;
				case "Irrigate_pastures":
					deletetoolbars();
					mapper.addControl(Irrigate_pastures_control);
					break;
				case "Irrigate_cropping":
					deletetoolbars();
					mapper.addControl(Irrigate_cropping_control);
					break;
				case "Urban_intensive_uses":
					deletetoolbars();
					mapper.addControl(Urban_intensive_uses_control);
					break;
				case "Intensive_production":
					deletetoolbars();
					mapper.addControl(Intensive_production_control);
					break;
				case "Rural_residential":
					deletetoolbars();
					mapper.addControl(Rural_residential_control);
					break;
				case "Mining_and_waste":
					deletetoolbars();
					mapper.addControl(Mining_and_waste_control);
					break;
				case "Water":
					deletetoolbars();
					mapper.addControl(Water_control);
					break;
			}

		}

		this.map.on(L.Draw.Event.CREATED, function (e) {
			var type = e.layerType,
				layer = e.layer;

			//TODO Let users name the popup
			if (type === 'marker') {
				layer.bindPopup('A popup!');
			}

			editableLayers.addLayer(layer);
			if (editableLayers) {
				editableLayers.bringToFront();
			}
		});
	}

	return new main();
})().init();
