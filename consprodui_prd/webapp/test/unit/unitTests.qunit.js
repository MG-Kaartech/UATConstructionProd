/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"commgcconsprodui/consprodui_prd/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
