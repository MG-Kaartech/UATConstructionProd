sap.ui.define([], 
    function() {
    'use strict';
    
    return {

        // To Fetch SSO user ID
        _FetchUserID : function(sPath) {
            return new Promise(function(resolve, reject) {
                $.ajax({
                    url:  sPath,
                    type: "GET",
                    async: true,
                    contentType: "application/json",
                    success: function (user) {
                        console.log(user);
                        resolve(user.firstname);
                    },
                    error:  function (err) {
                        console.log(err);
                        reject(err);
                    },
                });
            });
        },

        // Reading data from CAPM of the given model
        _ReadData : function (oModel, sPath, filters) {
            return new Promise(function(resolve, reject) {
                oModel.read(sPath, {
                    filters : filters,
                    async : true,
                    success : function(oData, oResp) {
                        resolve(oData, oResp);
                    },
                    error : function(err){
                        reject(err);
                    }
                })
            });
        },

        // For RT and OT calculation
        _calculate_RT_OT: function (oModel, sPath, oParams) {
            return new Promise(function (resolve, reject) {
                oModel.callFunction(sPath, {
                    urlParameters: oParams,
                    method: "GET",
                    success: function (oData, oResponse) {
                        var data = oData;
                        resolve(oData, oResponse);
                        console.log("RT OT Done");
                    },
                    error: function (oError) {
                        reject(oError);
                        console.log("No data");
                    }
                });
            });
        },

        // To submit data to the CAPM 
        _SubmitBatchData : function (oDataModel) {
            return new Promise(function (resolve, reject) {
                oDataModel.submitBatch(function (oResult) {
                    resolve(oResult.__batchResponses[0].__changeResponses);
                },
                function (err) {
                    reject(err);
                });
            });
        },

        // To trigger the BPA call
        _TriggerBPA_Post : function (_url, _sPayload) {
            return new Promise ((resolve, reject) =>{
                $.ajax({
                    url:  _url,
                    type: "POST",
                    async: false,
                    contentType: "application/json",
                    // headers : { "X-Csrf-Token": _token },
                    data: _sPayload,
                    success: function (odata) {
                        console.log(odata);
                        resolve(odata);
                    },
                    error:  function (err) {
                        console.log(err);
                        reject(err);
                    },
                });
            })
        }
    }
});