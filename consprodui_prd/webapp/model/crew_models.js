sap.ui.define([], 
    function() {
    'use strict';
    
    return {
        // Returns the model for Static table (Cost object Headings)
        _get_static_Model : function () {
            let table_1 = {
                "static_table" : [
                    {
                        "col_1": ""
                    },
                    {
                        "col_1": "PayCode"
                    },
                    {
                        "col_1": "Job"
                    },
                    {
                        "col_1": "Section"
                    },
                    {
                        "col_1": "Phase"
                    },
                    {
                        "col_1": "Qty"
                    },
                    {
                        "col_1": "UoM"
                    },
                    {
                        "col_1": "Work order"
                    },
                    {
                        "col_1": "Cost Center"
                    },
                    {
                        "col_1": "Activity"
                    },
                    {
                        "col_1": "Equipment"
                    }
                ]
            };
            return table_1;
        },

        _get_ResourceModel : function () {
            let ResourceModel = [
                // {
                //     "ID" : "",
                //     "col_1" : "",
                //     "col_2" : ""
                // }
            ];

            return ResourceModel;
        },

        _get_static2_Model : function() {
            let Model = [
                {
                    "col_1" : "Total hours",
                },
                {
                    "col_1" : "Notes"
                }
            ];

            return Model;
        },

        _get_table_11Model : function () {
            let table_11 = [
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": ""
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "",
                    "pid_1" : "",
                    "pid_2" : "",
                    "pid_3" : "",
                    "pid_4" : "",
                    "pid_5" : "",
                    "pid_6" : "",
                    "pid_7" : "",
                    "pid_8" : "",
                    "pid_9" : "",
                    "pid_10" : ""
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "",
                    "jid_1" : "",
                    "jid_2" : "",
                    "jid_3" : "",
                    "jid_4" : "",
                    "jid_5" : "",
                    "jid_6" : "",
                    "jid_7" : "",
                    "jid_8" : "",
                    "jid_9" : "",
                    "jid_10" : "",
                    "pc_1" : "",
                    "pc_2" : "",
                    "pc_3" : "",
                    "pc_4" : "",
                    "pc_5" : "",
                    "pc_6" : "",
                    "pc_7" : "",
                    "pc_8" : "",
                    "pc_9" : "",
                    "pc_10" : "",
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "",
                    "sid_1" : "",
                    "sid_2" : "",
                    "sid_3" : "",
                    "sid_4" : "",
                    "sid_5" : "",
                    "sid_6" : "",
                    "sid_7" : "",
                    "sid_8" : "",
                    "sid_9" : "",
                    "sid_10" : "",
                    "sdesc_1" : "",
                    "sdesc_2" : "",
                    "sdesc_3" : "",
                    "sdesc_4" : "",
                    "sdesc_5" : "",
                    "sdesc_6" : "",
                    "sdesc_7" : "",
                    "sdesc_8" : "",
                    "sdesc_9" : "",
                    "sdesc_10" : ""
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "",
                    "pid_1" : "",
                    "pid_2" : "",
                    "pid_3" : "",
                    "pid_4" : "",
                    "pid_5" : "",
                    "pid_6" : "",
                    "pid_7" : "",
                    "pid_8" : "",
                    "pid_9" : "",
                    "pid_10" : "",
                    "pdesc_1" : "",
                    "pdesc_2" : "",
                    "pdesc_3" : "",
                    "pdesc_4" : "",
                    "pdesc_5" : "",
                    "pdesc_6" : "",
                    "pdesc_7" : "",
                    "pdesc_8" : "",
                    "pdesc_9" : "",
                    "pdesc_10" : "",
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": ""
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": ""
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "",
                    "wid_1" : "",
                    "wid_2" : "",
                    "wid_3" : "",
                    "wid_4" : "",
                    "wid_5" : "",
                    "wid_6" : "",
                    "wid_7" : "",
                    "wid_8" : "",
                    "wid_9" : "",
                    "wid_10" : ""
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "",
                    "cid_1" : "",
                    "cid_2" : "",
                    "cid_3" : "",
                    "cid_4" : "",
                    "cid_5" : "",
                    "cid_6" : "",
                    "cid_7" : "",
                    "cid_8" : "",
                    "cid_9" : "",
                    "cid_10" : "",
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "",
                    "aid_1" : "",
                    "aid_2" : "",
                    "aid_3" : "",
                    "aid_4" : "",
                    "aid_5" : "",
                    "aid_6" : "",
                    "aid_7" : "",
                    "aid_8" : "",
                    "aid_9" : "",
                    "aid_10" : "",
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "",
                    "eid_1" : "",
                    "eid_2" : "",
                    "eid_3" : "",
                    "eid_4" : "",
                    "eid_5" : "",
                    "eid_6" : "",
                    "eid_7" : "",
                    "eid_8" : "",
                    "eid_9" : "",
                    "eid_10" : "",
                }
            ];

            return table_11
        },

        _get_Table_2Model : function() {
            let table_2 = [
                // {
                //     "col_1": "",
                //     "col_2": "",
                //     "col_3": "",
                //     "col_4": "",
                //     "col_5": "",
                //     "col_6": "",
                //     "col_7": "",
                //     "col_8": "",
                //     "col_9": "",
                //     "col_10": "",
                //     "id_1" : "",
                //     "id_2" : "",
                //     "id_3" : "",
                //     "id_4" : "",
                //     "id_5" : "",
                //     "id_6" : "",
                //     "id_7" : "",
                //     "id_8" : "",
                //     "id_9" : "",
                //     "id_10" : ""
                // }
            ];

            return table_2;
        },

        _get_TotalHoursModel : function () {
            let aTotalHours = [
                {
                    "col_1": "00:00",
                    "col_2": "00:00",
                    "col_3": "00:00",
                    "col_4": "00:00",
                    "col_5": "00:00",
                    "col_6": "00:00",
                    "col_7": "00:00",
                    "col_8": "00:00",
                    "col_9": "00:00",
                    "col_10": "00:00", 
                },
                {
                    "col_1": "",
                    "col_2": "",
                    "col_3": "",
                    "col_4": "",
                    "col_5": "",
                    "col_6": "",
                    "col_7": "",
                    "col_8": "",
                    "col_9": "",
                    "col_10": "", 
                }
            ];
            return aTotalHours;
        },

        _get_default_PayCodes : function () {
            let aDefault_PayCodes = [
                {
                    "PaycodeName" :"Admin Incent",
                    "PaycodeID" : "1005"
                },
                {
                    "PaycodeName" :"Holiday Worked",
                    "PaycodeID" : "1040"
                },
                {
                    "PaycodeName" :"Service Incentive",
                    "PaycodeID" : "1130"
                },
                {
                    "PaycodeName" :"Holiday Pay",
                    "PaycodeID" : "1030"
                },
                {
                    "PaycodeName" :"Bereavement",
                    "PaycodeID" : "1010"
                },
                {
                    "PaycodeName" :"On Call",
                    "PaycodeID" : "1095"
                },
                {
                    "PaycodeName" :"Sick",
                    "PaycodeID" : "1140"
                },
                {
                    "PaycodeName" :"Training",
                    "PaycodeID" : "1155"
                },
                {
                    "PaycodeName" :"Vacation",
                    "PaycodeID" : "2000"
                },
                {
                    "PaycodeName" :"Miles CA",
                    "PaycodeID" : "1165"
                },
                {
                    "PaycodeName" :"Miles US",
                    "PaycodeID" : "1170"
                },
                {
                    "PaycodeName" :"Miles",
                    "PaycodeID" : "1175"
                },
                {
                    "PaycodeName" :"Drops",
                    "PaycodeID" : "1180"
                },
                {
                    "PaycodeName" :"Tarping",
                    "PaycodeID" : "1185"
                },
                {
                    "PaycodeName" :"Layover",
                    "PaycodeID" : "1190"
                },
                {
                    "PaycodeName" :"Waiting Time",
                    "PaycodeID" : "1200"
                },
                {
                    "PaycodeName" :"Loading Time",
                    "PaycodeID" : "1205"
                },
                {
                    "PaycodeName" :"Breakdn Lay",
                    "PaycodeID" : "1210"
                },
                {
                    "PaycodeName" :"Breakdn Hrly",
                    "PaycodeID" : "1215"
                },
                {
                    "PaycodeName" :"Axle Days",
                    "PaycodeID" : "1220"
                },
                {
                    "PaycodeName" :"BOARD",
                    "PaycodeID" : "1225"
                },
                {
                    "PaycodeName" :"BRD-OWN-ACC",
                    "PaycodeID" : "BOA"
                },
                {
                    "PaycodeName" :"BRD-TRAV",
                    "PaycodeID" : "BT"
                },
                {
                    "PaycodeName" :"BRD-SPEC-PROJ",
                    "PaycodeID" : "BSP"
                },
                {
                    "PaycodeName" :"BRD-NIGHT(Half-Board)",
                    "PaycodeID" : "BN"
                },
                {
                    "PaycodeName" :"Shift Premium Hourly",
                    "PaycodeID" : "1080"
                },
                {
                    "PaycodeName" :"Snow Hrs Worked",
                    "PaycodeID" : "1149"
                },
                {
                    "PaycodeName" :"Snow Retainers Hrs",
                    "PaycodeID" : "1150"
                },
                {
                    "PaycodeName" :"Meal Allowances",
                    "PaycodeID" : "1230"
                },
                {
                    "PaycodeName" :"Unpaid Sick",
                    "PaycodeID" : "ups"
                },
                {
                    "PaycodeName" :"Unpaid Leave",
                    "PaycodeID" : "upl"
                },
                {
                    "PaycodeName" :"Shift Premium Amount",
                    "PaycodeID" : "1070"
                },
                {
                    "PaycodeName" :"Snow Service Incentive",
                    "PaycodeID" : "1151"
                },
                {
                    "PaycodeName" :"Snow Holiday Pay",
                    "PaycodeID" : "1152"
                },
                {
                    "PaycodeName" :"Snow Holiday Pay Worked",
                    "PaycodeID" : "1205"
                },
                {
                    "PaycodeName" :"Rain Pay",
                    "PaycodeID" : "1300"
                },
                
            ];
            return aDefault_PayCodes;
        }
    }
});