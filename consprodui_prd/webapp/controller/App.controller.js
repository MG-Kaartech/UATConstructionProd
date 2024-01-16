sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("com.mgc.consprodui.consproduiprd.controller.App", {
        onInit: function() {
          this.getView().addStyleClass("sapUiSizeCompact");
        }
      });
    }
  );
  