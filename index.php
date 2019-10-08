<?php require($_SERVER['DOCUMENT_ROOT'].'/wp-load.php');
require('head.php');
get_header(); ?>
<body>
	<div id="root" class="container">
		<div class="top text-center">
			<h3 style="color:#555">Greenprints</h3>
		</div>
        <div>Click <a href="/submit-bioregions/">here</a> if you'd like to add information about your Bioregion.</div>
		<div class="container-flex middle" style="height:100%">
            
			<div class="flex-1">
				<div class="panel-container" style="height:100%">
					
					<button id="panel-toggle" class="panel-toggle">
						<span></span>
					</button>
					
					<div id="panel-side" class="panel-side"> 
						<div class="row">
							<div class="col-10">
								<h5 class="ml-2 mr-2"></h5>
							</div>
						</div>
						<div id="controls">
							<ul>
							<li>
								<input type="checkbox" id="show-bioregions">
								<label for="bioregions">Always show bioregions</label>
							</li>
							<li >
								<input type="checkbox" id="show-subregions">
								<label for="subregions">Always show sub-bioregions</label>
							</li>	
							<li>
								<input type="checkbox" id="hide-bioregions">
								<label for="bioregions">Hide bioregions</label>
							</li>
							<li >
								<input type="checkbox" id="hide-subregions">
								<label for="subregions">Hide sub-bioregions</label>
							</li>						 
							</ul>
						</div>
					</div>

					<div id="mapid">
					<div class="leaflet-bottom leaflet-left">
							<button id="save-button" style="pointer-events: auto"><i class="fa fa-floppy-o" style="color:black" aria-hidden="true"></i></button>
						</div>
					</div>
					<div id="Drawingselector" class="Drawingselector">
						<select id='Selector' style="width: 100%">
							<option id="DrawingNone" value="DrawingNone">No Drawing tool selected</option>
							<option id="Nature_conservation" value="Nature_conservation">Nature conservation</option>
							<option id="Other_protected_areas" value="Other_protected_areas">Other protected areas
							</option>
							<option id="Minimal_use" value="Minimal_use">Minimal use</option>
							<option id="Grazing_native_vegetation" value="Grazing_native_vegetation">Grazing native
								vegetation</option>
							<option id="Production_forestry" value="Production_forestry">Production forestry</option>
							<option id="Grazing_modified_pastures" value="Grazing_modified_pastures">Grazing modified
								pastures</option>
							<option id="Plantation_forestry" value="Plantation_forestry">Plantation forestry</option>
							<option id="Dryland_cropping" value="Dryland_cropping">Dryland cropping</option>
							<option id="Dryland_horticulture" value="Dryland_horticulture">Dryland horticulture</option>
							<option id="Land_in_transition" value="Land_in_transition">Land in transition</option>
							<option id="Irrigate_pastures" value="Irrigate_pastures">Irrigate pastures</option>
							<option id="Irrigate_cropping" value="Irrigate_cropping">Irrigate cropping</option>
							<option id="Urban_intensive_uses" value="Urban_intensive_uses">Urban intensive uses</option>
							<option id="Intensive_production" value="Intensive_production">Intensive production</option>
							<option id="Rural_residential" value="Rural_residential">Rural residential</option>
							<option id="Mining_and_waste" value="Mining_and_waste">Mining and waste</option>
							<option id="Water" value="Water">Water</option>
						</select>
					</div>
				</div>
				
			</div>
			<div class="flex-2">
				<div class="card information-display">
					<div class="card-body" id="subregion-detail">
					</div>
				</div>
			</div>
		</div>

		<div class="bottom">
		<div class="Legend" style="margin-top: -100px;  margin-left: 100px;">
				<img src="https://www.greenprints.org.au/wp-content/uploads/2019/09/Legend.jpg" alt="temp" width="100%">
			</div>
		</div>
	</div>

	<div class="modal fade" id="region-detail-modal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
		<div class="modal-dialog" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<h3 id="region-detail-title"></h3>
					<button id="modal-close-button" type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
					</button>
				</div>
				<div id="region-detail-body" class="modal-body">
				
					<div id="accordion" role="tablist" aria-multiselectable="true">
						
					</div>
					<div id="region-loading">
						<div class="spinner"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
	
	<script type="text/javascript" src="./dist/bundle.js"></script>
</body>
<?php get_footer(); ?>