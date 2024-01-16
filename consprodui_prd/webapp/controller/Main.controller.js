sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/Column",
    "sap/m/ComboBox",
    "sap/m/TextArea",
    "sap/ui/core/Item",
    "sap/ui/export/Spreadsheet",
    "com/mgc/consprodui/consproduiprd/model/API_Servants",
    "com/mgc/consprodui/consproduiprd/model/crew_models",
    "com/mgc/consprodui/consproduiprd/libs/moment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/CustomData",
    "sap/ui/core/Fragment",
    "sap/ui/core/syncStyleClass",
    "sap/ui/core/Icon",
    "sap/m/ObjectStatus"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, MessageToast, Label, Text, Column, ComboBox, TextArea, Item, Spreadsheet, API_Servants, crew_models, momentjs, Filter, FilterOperator, CustomData, Fragment, syncStyleClass, Icon, ObjectStatus) {
        "use strict";

        var EmpID = "9084373";
        return Controller.extend("com.mgc.consprodui.consproduiprd.controller.Main", {
            onInit: function () {

                // Global PayCode - Personnel Sub Area for selected Employee
                this.aPSAs_data = [];

                // Foreman Details
                this.oForemanData = {};

                // Flag for 24 hours per row
                this.bFlag_24Row = false;

                // Total Hours Error Tracker (00:00)
                this.aTotal_Tracker = [];

                // Total tracker for number format (paycode)
                this.aPaytotal_tracker = [];

                // Half or One Tracker
                this.aHalfOrOne_Tracker = [];

                // Only One tracker
                this.aOne_Tracker = [];

                // Editable Status
                this.bEditable = true;
                this.bSaveModified = false;

                // Popover Data
                this.oResPopOverData = {};
                this.oEquipPopOverData = {};

                // Global Batch operation Array
                this.batchArray = [];
                this.payPeriod = {
                    startDate: "",
                    endDate: ""
                };

                // Modified flag
                this.bModified_flag = false;

                // For SearhcHelp
                this.SearchHelp_original = {
                    Employees: [],
                    Equipments: [],
                    Jobs: [],
                    Sections: [],
                    Phases: [],
                    WorkOrders: [],
                    CostCenters: [],
                    UoMs: [],
                    PayCodes: [],
                    Activity: []
                };

                this.SearchHelp = {
                    Employees: [],
                    Equipments: [],
                    Jobs: [],
                    Sections: [],
                    Phases: [],
                    WorkOrders: [],
                    CostCenters: [],
                    UoMs: [],
                    PayCodes: [],
                    Activity: []
                };

                // Backend Data model
                this.oBModels = this.getOwnerComponent().getModel();        // <-- CAP Api
                this.oSModels = this.getOwnerComponent().getModel("v2");    // <-- SF Api

                this.oHeader = {
                    date: new Date()
                };

                // Table 1 - static table
                this.oTableModel_1 = new JSONModel(crew_models._get_static_Model());
                this.getView().setModel(this.oTableModel_1, 'tabel_1');

                // Static Table - 2
                this.staticTable_2 = new JSONModel(crew_models._get_static2_Model());
                this.getView().setModel(this.staticTable_2, "static2");
                
                // PopOverData
                let oPopOverModel = new JSONModel(this.oResPopOverData);
                this.getView().setModel(oPopOverModel, "res_popover");

                let oEquipPopOverModel = new JSONModel(this.oEquipPopOverData);
                this.getView().setModel(oEquipPopOverModel, "equip_popover");

                this._get_AllData();
            },


            
            /*******************************************************************
            *  Promises
            *******************************************************************/
            _get_AllData: async function () {
                try {

                    this._BusyIndicator("Loading Application Data");

                    // Getting logged IN User data
                    const e = this._getBaseURL() + "/user-api/currentUser";
                    EmpID = await API_Servants._FetchUserID(e);
                    console.log("Current user ID", EmpID);

                    // Hours Editable History Array
                    this.aHours_Tracker = []; 
                    this.aVisibility_Tracker = [];
                    this.no_of_Cols = 0;

                    this.oCount = {
                        empCount: 0,
                        equipCount: 0
                    };

                    // Employees
                    let oEmpData = await this._get_EmployeeList_Promise(EmpID);
                    console.log("Employees :", oEmpData.results);

                    // Find the logged in foreman data and keep it in the global attribute
                    this.oForemanData = oEmpData.results.find((emp) => emp.ID === EmpID);

                    // Building the PSA array from employee data
                    let aPSAs = oEmpData.results.map((emp) => emp.PersonnelSubArea);

                    // Removing the duplicates
                    aPSAs = [...new Set(aPSAs)];

                    // Fetching the PSA related Paycodes and storing the global attribute
                    let oPayCodes = await this._PayCode_Promise(aPSAs);
                    console.log(oPayCodes.results);
                    this.aPSAs_data = oPayCodes.results;
                    
                    // Removing duplicates and Building the array for the payCode search help
                    let aPayCodes = oPayCodes.results.map(({ PaycodeID, PaycodeName }) => ({ PaycodeID, PaycodeName })),
                        aPayCodeValues = Array.from(new Set(aPayCodes.map(JSON.stringify))).map(JSON.parse);

                    //Equipments
                    let oEquipData = await this._get_EquipmentList_Promise();
                    console.log("Equipments :", oEquipData.results);

                    // Getting PayPeriod Data
                    let oPayPeriod = await this._PayPeriod_Promise();
                    console.log("PayPeriod Data :", oPayPeriod);

                    // Processing PayPeriod
                    this._processPayPeriod(oPayPeriod, new Date());

                    // Jobs
                    let oJobData = await this._Job_Promise();
                    console.log("Jobs : ", oJobData.results);

                    // Sections
                    let oSectionData = await this._Section_Promise("");
                    console.log("Sections :", oSectionData.results);

                    // Phases
                    let oPhaseData = await this._Phase_Promise("");
                    console.log("Phases :", oPhaseData.results);

                    // TODO: Get the UOM data for the searchHelp
                    let oUomData = await this._UoM_Promise();
                    console.log("Uom Data :", oUomData.results);

                    // Work Orders
                    let oWorkOrderData = await this._WorkOrder_Promise();
                    console.log("Work Order :", oWorkOrderData.results);

                    // Cost Centers
                    let oCostCenterData = await this._CostCenter_Promise();
                    console.log("Cost Center :", oCostCenterData.results);

                    // Company Code Promise
                    let oCompany = await this._Company_Promise();
                    console.log("Company Data :", oCompany.results);

                    // Mapping the company name details to cost center's company code
                    for (let i = 0; i < oCostCenterData.results.length; i++) {
                        if (oCostCenterData.results[i].legalEntity && oCostCenterData.results[i].legalEntity !== null && oCostCenterData.results[i].legalEntity !== "") {
                            let oRecord = oCompany.results.find((oRec) => oRec.externalCode === oCostCenterData.results[i].legalEntity);
                            oCostCenterData.results[i] = {
                                ...oCostCenterData.results[i],
                                CompanyDescription: oRecord.name
                            }
                        }
                    }

                    // Activity
                    let oActivityData = await this._Activity_Promise(),
                        aActTemp = oActivityData.results,
                        aActData;
                    console.log("Activity :", aActTemp);

                    // Removing duplicates in Activity Data
                    const aActKey = ["ActivityID", "ActivityName"];
                    aActData = aActTemp.filter(
                        (s => o =>
                            (k => !s.has(k) && s.add(k))
                            (aActKey.map(k => o[k]).join('|'))
                        )
                        (new Set)
                    );

                    // TODO: Bind the fetched data to searchHelp Model
                    this.SearchHelp = {
                        ...this.SearchHelp,
                        Employees: oEmpData.results,
                        Equipments: oEquipData.results,
                        Jobs: oJobData.results,
                        Sections: oSectionData.results,
                        Phases: oPhaseData.results,
                        UoMs: oUomData.results,
                        WorkOrders: oWorkOrderData.results,
                        CostCenters: oCostCenterData.results,
                        Activity: aActData,
                        PayCodes: aPayCodeValues
                    };

                    // Keeping the master data separately for filteration purpose
                    this.SearchHelp_original = {
                        ...this.SearchHelp_original,
                        Employees: oEmpData.results,
                        Equipments: oEquipData.results,
                        Jobs: oJobData.results,
                        Sections: oSectionData.results,
                        Phases: oPhaseData.results,
                        UoMs: oUomData.results,
                        WorkOrders: oWorkOrderData.results,
                        CostCenters: oCostCenterData.results,
                        Activity: aActData,
                        PayCodes: aPayCodeValues
                    };

                    let oSearchModel = new JSONModel(this.SearchHelp)
                    this.getView().setModel(oSearchModel, "searchHelp");

                    // Getting timesheet data
                    let oTimeData = await this._get_TimesheetDetails(new Date());

                    // Determines Editable or non-editable
                    await this._determine_editable(oTimeData.results);

                    // Converts DB row data to UI Model data
                    await this._prepare_ModelData(oTimeData.results);
                } catch (err) {
                    console.log(err);
                    this._CloseBusyDialog();
                }
            },

            // Promise to take the PayPeriod
            _PayPeriod_Promise: function () {
                console.log("2.Fetching PayPeriod");

                var mFilter = [];
                mFilter.push(new Filter({
                    path: "PayCalendar_payGroup",
                    operator: FilterOperator.EQ,
                    value1: "MGBWLY",
                }));

                return API_Servants._ReadData(this.oSModels, "/PayPeriod", mFilter);
            },

            // Processes PayPeriod Data
            _processPayPeriod: function (oPayPeriod, _date) {
                let _cDate = moment(_date, "DD-MM-YYYY"),
                    bFoundPayPeriod = false,
                    dStartDate, dEndDate;
                for (let item of oPayPeriod.results) {
                    dStartDate = moment(item.cust_MGCPayPeriodBeginDate, "YYYY-MM-DD");
                    dEndDate = moment(item.cust_MGCPayPeriodEndDate, "YYYY-MM-DD");
                    if (_cDate.isBetween(dStartDate, dEndDate) || _cDate.isSame(dStartDate, 'day') || _cDate.isSame(dEndDate, 'day')) {
                        bFoundPayPeriod = true;
                        break;
                    }
                }
                if (bFoundPayPeriod) {
                    MessageToast.show(`Current PayPeriod is from\n${dStartDate.format("MM/DD/YYYY")} to ${dEndDate.format("MM/DD/YYYY")}`, { duration: 10000, width: "30em", closeOnBrowserNavigation: false });
                    this.oHeader = {
                        ...this.oHeader,
                        maxDate: new Date(dEndDate.format("YYYY/MM/DD")),
                    };
                    this.payPeriod = {
                        ...this.payPeriod,
                        startDate: new Date(dStartDate.format("YYYY/MM/DD")),
                        endDate: new Date(dEndDate.format("YYYY/MM/DD")),
                    }
                    // this.byId("_cpy_button_2").setEnabled(true);
                    this.is_InsidePayPeriod = true;
                } else {
                    MessageToast.show(`${_cDate.format("MM/DD/YYYY")} is not between any PayPeriod`, { duration: 10000, width: "30em", closeOnBrowserNavigation: false });
                    // this._Disable_All(true);
                    // this.byId("_cpy_button_2").setEnabled(false);
                    this.is_InsidePayPeriod = false;
                }
            },

            // Checks the given date is between current payperiod
            _checkPayPeriod: function (_value) {
                let _mDate = moment(_value, "DD-MM-YYYY"),
                    _startDate = moment(this.payPeriod.startDate, "DD-MM-YYYY"),
                    _endDate = moment(this.payPeriod.endDate, "DD-MM-YYYY");

                if (_mDate.isBetween(_startDate, _endDate) || _mDate.isSame(_startDate, 'day') || _mDate.isSame(_endDate, 'day')) {
                    this.is_InsidePayPeriod = true;
                } else {
                    this.is_InsidePayPeriod = false;
                }
                this.getView().getModel("header").updateBindings();
            },

            // Takes the timesheet data of the specified date in the parameter
            _get_TimesheetDetails : function (_pDate) {
                let mFilters = [];
                console.log("1. Fethcing Timesheet Data");
                mFilters.push(new Filter({
                    path: "AppName",
                    operator: FilterOperator.EQ,
                    value1: "CP_CREW",
                }));
                mFilters.push(new Filter({
                    path: "Date",
                    operator: FilterOperator.EQ,
                    value1: moment(_pDate).format("YYYY-MM-DD"),
                }));
                mFilters.push(new Filter({
                    path: "ForemanID",
                    operator: FilterOperator.EQ,
                    value1: EmpID
                }));
                return API_Servants._ReadData(this.oBModels, "/TimeSheetDetails_prd", mFilters);
            },

            // Determines Editable or non-editable status of the entire application
            _determine_editable : function(_data) {
                // **************** Start of needed ******************
                // if(_data.some((orec) => orec.SaveSubmitStatus === "Awaiting Approval") || _data.some((orec) => orec.SaveSubmitStatus === "Approved") || _data.some((orec) => orec.SaveSubmitStatus === "Rejected"))
                // **************** End of needed ********************
                if(_data.some((orec) => orec.SaveSubmitStatus === "Awaiting Approval") )
                    this.bEditable = false;
                else
                    this.bEditable = true;

                // Save Modified button Enablement
                if(_data.some((orec) => orec.SaveSubmitStatus === "Rejected")) {
                    this.bSaveModified = false;
                } else {
                    this.bSaveModified = true;
                }

                if(!_data.some((orec) => orec.SaveSubmitStatus === "Rejected") 
                    && _data.some((orec) => orec.SaveSubmitStatus === "Awaiting Approval")
                    && !_data.some((orec) => orec.SaveSubmitStatus === "Approved")
                    && !_data.some((orec) => orec.SaveSubmitStatus === "Saved") ) {
                        this._disable_footer_resubmitOptions(true);
                }
            },

            // Preparing UI Model data from the backend results
            _prepare_ModelData : function (_data) {
                console.log(_data);
                if (_data.length !== 0) {
                    let aResData = [], // <-- Bind to UI Model
                        aEmpTemp = [],
                        aEquipTemp = [],

                        aCostData = this._get_CostTemplate(), // stores column wise Cost data (<-- Bind to UI Model)
                        aCostTemp = [], // stores row wise Cost data with duplicate
                        aCostArr = [],  // stores row wise Cost data without duplicate

                        aHoursData = [];    // <-- Bind to UI Model
                    
                    // Keys based on which the duplicates are removed
                    const aResKeys = ['EID', 'col_1'],
                          aCostKeys = ['PayCode', 'Job', 'Section', 'Phase', 'Qty', 'UOM', 'WorkOrder', 'CostCenter', 'Activity', 'ReceivingUnitTruck', 'Comments'];

                    // arrange the details based on the sequence number
                    _data.sort((a, b) => {
                        return a.SequenceNo.split(',')[1] - b.SequenceNo.split(',')[1];
                    });

                    // iterating the row data
                    for (let i = 0; i < _data.length; i++) {
                        let oData = _data[i],
                            oEmpTemp = this._get_ResTemplate(),
                            oEquipTemp = this._get_ResTemplate(),
                            oCostTemp = {};

                        //1. Copying the Resource data (Employee/Equipment --> Includes Duplicate Data)
                        if (oData.EmployeeID !== '') {       // Copy as Employee Data
                            let e_data = this.SearchHelp_original.Employees.find(e => e.ID === oData.EmployeeID),
                                displayName = `${oData.EmployeeID}-${oData.EmployeeName}`;

                            oEmpTemp = {
                                ...oEmpTemp,
                                EID: oData.EmployeeID,
                                col_1: displayName,
                                SequenceNo: oData.SequenceNo,
                                PersonnelSubArea: oData.PersonnelSubArea,
                                PersonnelSubAreaDescription: e_data.PersonnelSubAreaDescription,
                                LocationCode: oData.LocationCode,
                                LocationCodeDescription: e_data.LocationCodeDescription,
                                CompanyID: oData.CompanyID,
                                CompanyName: oData.CompanyName,
                                OtThreshold: e_data.Ot_Threshold,
                                OtFrequency : e_data.Ot_Frequency,
                                Email: e_data.Email,
                                JobTitle: e_data.JobTitle,
                                Province: e_data.Province,
                                ProvinceDescription: e_data.ProvinceDescription,
                                Phone: e_data.Phone,
                                FirstName: e_data.FirstName,
                                LastName: e_data.LastName,
                                FullName: oData.EmployeeName,
                            };
                            aEmpTemp.push(oEmpTemp);        // Pushing copied object into array temporarily for processing
                        } else { // Copy as Equipment Data
                            let e_data = this.SearchHelp_original.Equipments.find(e => e.ID === oData.EquipmentID);
                            oEquipTemp = {
                                ...oEquipTemp,
                                EID: oData.SendingUnitTrailer,
                                col_1: this._get_EquipmentDescription(oData.SendingUnitTrailer),
                                SequenceNo: oData.SequenceNo,
                                LastName: e_data.LastName,
                                PermissionLevel: e_data.PermissionLevel,
                                Description: e_data.Description,
                            };   
                            aEquipTemp.push(oEquipTemp);    // Pushing copied object into array temporarily for processing
                        }

                        //2. Copying Cost Data with TotalHours (includes duplicate data)
                        // let sTHours = oData.TotalHours.replace(".", ":");
                        oCostTemp = {
                            ...oCostTemp,
                            ID: oData.ID,
                            PayCode: oData.PayCode,
                            Job: oData.Job,
                            JobDescription: oData.JobDescription,
                            ProfitCenter: oData.ProfitCenter,
                            Section: oData.Section,
                            SectionDescription: oData.SectionDescription,
                            Phase: oData.Phase,
                            PhaseDescription: oData.PhaseDescription,
                            Qty: oData.Qty,
                            UoM: oData.UOM,
                            WorkOrder: oData.WorkOrder,
                            WorkorderDescription: oData.WorkorderDescription,
                            CostCenter: oData.CostCenter,
                            Activity: oData.Activity,
                            ReceivingUnitTruck: oData.ReceivingUnitTruck,
                            SequenceNo: oData.SequenceNo,
                            TotalHours: oData.TotalHours,
                            SaveSubmitStatus: oData.SaveSubmitStatus,
                            Comments: oData.Comments,
                        };

                        // Pushing copied object into array temporarily for processing
                        aCostTemp.push(oCostTemp);
                    }

                    // Removing the duplicates from the Temporary Employee Array
                    aEmpTemp = aEmpTemp.filter(
                        (s => o =>
                            (k => !s.has(k) && s.add(k))
                            (aResKeys.map(k => o[k]).join('|'))
                        )
                        (new Set)
                    );

                    // Increment Employee count by length
                    this._add_employeeCount(aEmpTemp.length);
                    console.log("Total Employee : ", this._get_EmpCount());

                    // Removing the duplicates from the Temporary Equipment Array
                    aEquipTemp = aEquipTemp.filter(
                        (s => o => 
                            (k => !s.has(k) && s.add(k))
                            (aResKeys.map(k => o[k]).join('|'))
                        )
                        (new Set)
                    );

                    // Increment Equipment count by length
                    this._add_equipCount(aEquipTemp.length);
                    console.log("Total Equipment : ", this._get_EquipCount());

                    // Removing the duplicates from the Temporary Cost Array
                    aCostArr = aCostTemp.filter(
                        (s => o =>
                            (k => !s.has(k) && s.add(k))
                            (aCostKeys.map(k => o[k]).join('|'))
                        )
                        (new Set)
                    );

                    this.no_of_Cols = aCostArr.length;

                    // Merging Emp Data and Equipment Data into the final Array as Resource Array
                    aResData = aEmpTemp.concat(aEquipTemp);
                    console.log("Consolidated Resource Data : ", aResData);

                    // arrange the details based on the sequence number
                    aResData.sort((a, b) => {
                        return a.SequenceNo.split(',')[1] - b.SequenceNo.split(',')[1];
                    });

                    // arrange the details based on the sequence number
                    aCostArr.sort((a, b) => {
                        return a.SequenceNo.split(',')[1] - b.SequenceNo.split(',')[1];
                    });

                    // iterating the resource table for building the hours table (resource and cost element combination)
                    let seq = 1;
                    for (let i = 0; i < aResData.length; i++) {
                        let oRes = aResData[i],
                            oHours = this._get_HoursTemplate();

                        // iterating the cost data for getting the hours
                        for (let j = 0; j < aCostArr.length; j++) {
                            let Hours = this._get_corressponding_Hours(seq, aCostTemp, j),
                                h_id = this._get_corressponding_ID(seq, aCostTemp),
                                status = this._get_corressponding_Status(seq, aCostTemp);

                            seq = seq + 1;
                            switch (j) {
                                case 0: oHours.col_1 = Hours; oHours.id_1 = h_id; oHours.status_1 = status; break;
                                case 1: oHours.col_2 = Hours; oHours.id_2 = h_id; oHours.status_2 = status; break;
                                case 2: oHours.col_3 = Hours; oHours.id_3 = h_id; oHours.status_3 = status; break;
                                case 3: oHours.col_4 = Hours; oHours.id_4 = h_id; oHours.status_4 = status; break;
                                case 4: oHours.col_5 = Hours; oHours.id_5 = h_id; oHours.status_5 = status; break;
                                case 5: oHours.col_6 = Hours; oHours.id_6 = h_id; oHours.status_6 = status; break;
                                case 6: oHours.col_7 = Hours; oHours.id_7 = h_id; oHours.status_7 = status; break;
                                case 7: oHours.col_8 = Hours; oHours.id_8 = h_id; oHours.status_8 = status; break;
                                case 8: oHours.col_9 = Hours; oHours.id_9 = h_id; oHours.status_9 = status; break;
                                case 9: oHours.col_10 = Hours; oHours.id_10 = h_id; oHours.status_10 = status; break;
                            }
                        }
                        aHoursData.push(oHours);
                    }

                    // Sorting the cost element sequence again to preserve the original order
                    aCostArr.sort((a, b) => {
                        return a.SequenceNo.split(',')[0] - b.SequenceNo.split(',')[0];
                    });

                    // iterating cost element data to transpose the Cost Element Data from Row wise to Column wise
                    let t_hours = crew_models._get_TotalHoursModel();
                    for (let i = 0; i < aCostArr.length; i++) {
                        const oCostElement = aCostArr[i];

                        switch(i) {
                            case 0 :
                                aCostData[1].col_1 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_1 = oCostElement.PayCode;
                                aCostData[2].jid_1 = oCostElement.Job;
                                aCostData[2].col_1 = oCostElement.JobDescription;
                                aCostData[2].pc_1 = oCostElement.ProfitCenter;
                                aCostData[3].sid_1 = oCostElement.Section;
                                aCostData[3].col_1 = oCostElement.SectionDescription;
                                aCostData[4].pid_1 = oCostElement.Phase;
                                aCostData[4].col_1 = oCostElement.PhaseDescription;
                                aCostData[5].col_1 = oCostElement.Qty;
                                aCostData[6].col_1 = oCostElement.UoM;
                                aCostData[7].wid_1 = oCostElement.WorkOrder;
                                aCostData[7].col_1 = oCostElement.WorkorderDescription;
                                aCostData[8].col_1 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_1 = oCostElement.CostCenter;
                                aCostData[9].col_1 = oCostElement.Activity;
                                aCostData[10].col_1 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_1 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_1 = oCostElement.Comments;
                                break;
                            case 1 :
                                aCostData[1].col_2 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_2 = oCostElement.PayCode;
                                aCostData[2].jid_2 = oCostElement.Job;
                                aCostData[2].col_2 = oCostElement.JobDescription;
                                aCostData[2].pc_2 = oCostElement.ProfitCenter;
                                aCostData[3].sid_2 = oCostElement.Section;
                                aCostData[3].col_2 = oCostElement.SectionDescription;
                                aCostData[4].pid_2 = oCostElement.Phase;
                                aCostData[4].col_2 = oCostElement.PhaseDescription;
                                aCostData[5].col_2 = oCostElement.Qty;
                                aCostData[6].col_2 = oCostElement.UoM;
                                aCostData[7].wid_2 = oCostElement.WorkOrder;
                                aCostData[7].col_2 = oCostElement.WorkorderDescription;
                                aCostData[8].col_2 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_2 = oCostElement.CostCenter;
                                aCostData[9].col_2 = oCostElement.Activity;
                                aCostData[10].col_2 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_2 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_2 = oCostElement.Comments;
                                break;
                            case 2:
                                aCostData[1].col_3 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_3 = oCostElement.PayCode;
                                aCostData[2].jid_3 = oCostElement.Job;
                                aCostData[2].col_3 = oCostElement.JobDescription;
                                aCostData[2].pc_3 = oCostElement.ProfitCenter;
                                aCostData[3].sid_3 = oCostElement.Section;
                                aCostData[3].col_3 = oCostElement.SectionDescription;
                                aCostData[4].pid_3 = oCostElement.Phase;
                                aCostData[4].col_3 = oCostElement.PhaseDescription;
                                aCostData[5].col_3 = oCostElement.Qty;
                                aCostData[6].col_3 = oCostElement.UoM;
                                aCostData[7].wid_3 = oCostElement.WorkOrder;
                                aCostData[7].col_3 = oCostElement.WorkorderDescription;
                                aCostData[8].col_3 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_3 = oCostElement.CostCenter;
                                aCostData[9].col_3 = oCostElement.Activity;
                                aCostData[10].col_3 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_3 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_3 = oCostElement.Comments;
                                break;
                            case 3:
                                aCostData[1].col_4 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_4 = oCostElement.PayCode;
                                aCostData[2].jid_4 = oCostElement.Job;
                                aCostData[2].col_4 = oCostElement.JobDescription;
                                aCostData[2].pc_4 = oCostElement.ProfitCenter;
                                aCostData[3].sid_4 = oCostElement.Section;
                                aCostData[3].col_4 = oCostElement.SectionDescription;
                                aCostData[4].pid_4 = oCostElement.Phase;
                                aCostData[4].col_4 = oCostElement.PhaseDescription;
                                aCostData[5].col_4 = oCostElement.Qty;
                                aCostData[6].col_4 = oCostElement.UoM;
                                aCostData[7].wid_4 = oCostElement.WorkOrder;
                                aCostData[7].col_4 = oCostElement.WorkorderDescription;
                                aCostData[8].col_4 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_4 = oCostElement.CostCenter;
                                aCostData[9].col_4 = oCostElement.Activity;
                                aCostData[10].col_4 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_4 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_4 = oCostElement.Comments;
                                break;
                            case 4:
                                aCostData[1].col_5 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_5 = oCostElement.PayCode;
                                aCostData[2].jid_5 = oCostElement.Job;
                                aCostData[2].col_5 = oCostElement.JobDescription;
                                aCostData[2].pc_5 = oCostElement.ProfitCenter;
                                aCostData[3].sid_5 = oCostElement.Section;
                                aCostData[3].col_5 = oCostElement.SectionDescription;
                                aCostData[4].pid_5 = oCostElement.Phase;
                                aCostData[4].col_5 = oCostElement.PhaseDescription;
                                aCostData[5].col_5 = oCostElement.Qty;
                                aCostData[6].col_5 = oCostElement.UoM;
                                aCostData[7].wid_5 = oCostElement.WorkOrder;
                                aCostData[7].col_5 = oCostElement.WorkorderDescription;
                                aCostData[8].col_5 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_5 = oCostElement.CostCenter;
                                aCostData[9].col_5 = oCostElement.Activity;
                                aCostData[10].col_5 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_5 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_5 = oCostElement.Comments;
                                break;
                            case 5:
                                aCostData[1].col_6 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_6 = oCostElement.PayCode;
                                aCostData[2].jid_6 = oCostElement.Job;
                                aCostData[2].col_6 = oCostElement.JobDescription;
                                aCostData[2].pc_6 = oCostElement.ProfitCenter;
                                aCostData[3].sid_6 = oCostElement.Section;
                                aCostData[3].col_6 = oCostElement.SectionDescription;
                                aCostData[4].pid_6 = oCostElement.Phase;
                                aCostData[4].col_6 = oCostElement.PhaseDescription;
                                aCostData[5].col_6 = oCostElement.Qty;
                                aCostData[6].col_6 = oCostElement.UoM;
                                aCostData[7].wid_6 = oCostElement.WorkOrder;
                                aCostData[7].col_6 = oCostElement.WorkorderDescription;
                                aCostData[8].col_6 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_6 = oCostElement.CostCenter;
                                aCostData[9].col_6 = oCostElement.Activity;
                                aCostData[10].col_6 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_6 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_6 = oCostElement.Comments;
                                break;
                            case 6:
                                aCostData[1].col_7 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_7 = oCostElement.PayCode;
                                aCostData[2].jid_7 = oCostElement.Job;
                                aCostData[2].col_7 = oCostElement.JobDescription;
                                aCostData[2].pc_7 = oCostElement.ProfitCenter;
                                aCostData[3].sid_7 = oCostElement.Section;
                                aCostData[3].col_7 = oCostElement.SectionDescription;
                                aCostData[4].pid_7 = oCostElement.Phase;
                                aCostData[4].col_7 = oCostElement.PhaseDescription;
                                aCostData[5].col_7 = oCostElement.Qty;
                                aCostData[6].col_7 = oCostElement.UoM;
                                aCostData[7].wid_7 = oCostElement.WorkOrder;
                                aCostData[7].col_7 = oCostElement.WorkorderDescription;
                                aCostData[8].col_7 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_7 = oCostElement.CostCenter;
                                aCostData[9].col_7 = oCostElement.Activity;
                                aCostData[10].col_7 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_7 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_7 = oCostElement.Comments;
                                break;
                            case 7:
                                aCostData[1].col_8 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_8 = oCostElement.PayCode;
                                aCostData[2].jid_8 = oCostElement.Job;
                                aCostData[2].col_8 = oCostElement.JobDescription;
                                aCostData[2].pc_8 = oCostElement.ProfitCenter;
                                aCostData[3].sid_8 = oCostElement.Section;
                                aCostData[3].col_8 = oCostElement.SectionDescription;
                                aCostData[4].pid_8 = oCostElement.Phase;
                                aCostData[4].col_8 = oCostElement.PhaseDescription;
                                aCostData[5].col_8 = oCostElement.Qty;
                                aCostData[6].col_8 = oCostElement.UoM;
                                aCostData[7].wid_8 = oCostElement.WorkOrder;
                                aCostData[7].col_8 = oCostElement.WorkorderDescription;
                                aCostData[8].col_8 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_8 = oCostElement.CostCenter;
                                aCostData[9].col_8 = oCostElement.Activity;
                                aCostData[10].col_8 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_8 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_8 = oCostElement.Comments;
                                break;
                            case 8:
                                aCostData[1].col_9 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_9 = oCostElement.PayCode;
                                aCostData[2].jid_9 = oCostElement.Job;
                                aCostData[2].col_9 = oCostElement.JobDescription;
                                aCostData[2].pc_9 = oCostElement.ProfitCenter;
                                aCostData[3].sid_9 = oCostElement.Section;
                                aCostData[3].col_9 = oCostElement.SectionDescription;
                                aCostData[4].pid_9 = oCostElement.Phase;
                                aCostData[4].col_9 = oCostElement.PhaseDescription;
                                aCostData[5].col_9 = oCostElement.Qty;
                                aCostData[6].col_9 = oCostElement.UoM;
                                aCostData[7].wid_9 = oCostElement.WorkOrder;
                                aCostData[7].col_9 = oCostElement.WorkorderDescription;
                                aCostData[8].col_9 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_9 = oCostElement.CostCenter;
                                aCostData[9].col_9 = oCostElement.Activity;
                                aCostData[10].col_9 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_9 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_9 = oCostElement.Comments;
                                break;
                            case 9:
                                aCostData[1].col_10 = this._get_PayCodeDescription(oCostElement.PayCode);
                                aCostData[1].pid_10 = oCostElement.PayCode;
                                aCostData[2].jid_10 = oCostElement.Job;
                                aCostData[2].col_10 = oCostElement.JobDescription;
                                aCostData[2].pc_10 = oCostElement.ProfitCenter;
                                aCostData[3].sid_10 = oCostElement.Section;
                                aCostData[3].col_10 = oCostElement.SectionDescription;
                                aCostData[4].pid_10 = oCostElement.Phase;
                                aCostData[4].col_10 = oCostElement.PhaseDescription;
                                aCostData[5].col_10 = oCostElement.Qty;
                                aCostData[6].col_10 = oCostElement.UoM;
                                aCostData[7].wid_10 = oCostElement.WorkOrder;
                                aCostData[7].col_10 = oCostElement.WorkorderDescription;
                                aCostData[8].col_10 = this._get_CostCenterDescription(oCostElement.CostCenter);
                                aCostData[8].cid_10 = oCostElement.CostCenter;
                                aCostData[9].col_10 = oCostElement.Activity;
                                aCostData[10].col_10 = this._get_EquipmentDescription(oCostElement.ReceivingUnitTruck);
                                aCostData[10].eid_10 = oCostElement.ReceivingUnitTruck;
                                t_hours[1].col_10 = oCostElement.Comments;
                                break;
                        }
                    }

                    // Filling the Hours Tracker
                    for (let i = 0; i < this.no_of_Cols; i++) {
                        const element = aCostArr[i];
                        this.aHours_Tracker.push(i + 1);
                        // if(element.PayCode === "1130" || element.PayCode === "1005") {
                        //     this.aHalfOrOne_Tracker.push(i+1);
                        // } else 
                        if (element.PayCode === "1070" || element.PayCode === "1225" || element.PayCode === "1230"
                            || element.PayCode === "BOA" || element.PayCode === "BN" || element.PayCode === "BT") {
                            this.aOne_Tracker.push(i + 1);
                        }
                    }

                    console.log(aHoursData);
                    // Row wise total calculation
                    aResData = this._calculateEntireRowTotal(aHoursData, aResData);

                    // Column wise total calculation
                    t_hours = this._calculateEntireColTotal(aHoursData, t_hours);

                    // Setting all the prepared data to the UI Model
                    // Table - 3 - Resourse Input
                    this.oResource = new JSONModel(aResData);
                    this.getView().setModel(this.oResource, 'resource');

                    // Table 2 -Cost Element Header Table
                    this.oCE_Model = new JSONModel(aCostData);
                    this.getView().setModel(this.oCE_Model, 'table_11');

                    // Total Hours Table data
                    this.TotalHoursData = new JSONModel(t_hours);
                    this.getView().setModel(this.TotalHoursData, "tt_hours");

                    // Tabe 4 - Resource Hours Input
                    this.oResHours = new JSONModel(aHoursData);
                    this.getView().setModel(this.oResHours, 'table_2'); 

                    // Header Table
                    this.oHeaderModel = new JSONModel(this.oHeader);
                    this.getView().setModel(this.oHeaderModel, "header");

                    // Preserving the UI States
                    this._preserveUIStates(aCostData);

                    // Preserving the Total Hours States
                    this._preserve_ResourceTotalStates(aResData);
                    this._preserve_TotalHoursStates(t_hours);

                    // Enable or disable the Copy previous day
                    if (this.is_InsidePayPeriod){
                        this.byId("_cpy_button_2").setEnabled(true);
                        if (this.bEditable) {
                            // // // Buttons after submittion
                            // this._hide_resubmitOptions(true);
                            // // this._disable_footer_resubmitOptions(true)
                            // this._enable_legends(false);

                            // // // Buttons before submittion
                            // this._hide_Footer_buttons(false)
                            this._disable_footer_buttons(false);

                            this._disable_header_actional_button(false);
                        }
                        else {
                            // // Buttons after submittion
                            // this._hide_resubmitOptions(false);
                            // this._initial_footer_resubmitOptions();
                            // this._enable_legends(true);

                            // // // Buttons before submittion
                            // this._hide_Footer_buttons(true)
                            this._disable_footer_buttons(true);
                            
                            this._disable_header_actional_button(true);
                        }
                    }
                    else {
                        this.byId("_cpy_button_2").setEnabled(false);
                        this._disable_footer_buttons(true);
                        this._disable_header_actional_button(true);
                    }
                    this.byId("_cpy_button_2").setEnabled(false);
                    this.byId("export_1").setEnabled(true);
                    this._redetermine_SH_CO();
                    this._CloseBusyDialog();
                } else {
                    // Table 2 - Header Table - Inputs
                    this.oEmployeeModel_11 = new JSONModel(crew_models._get_table_11Model());
                    this.getView().setModel(this.oEmployeeModel_11, 'table_11');

                    // Table - 3 - Resourse Input
                    this.oResource = new JSONModel(crew_models._get_ResourceModel());
                    this.getView().setModel(this.oResource, 'resource');

                    // Tabe 4 - resource Hours Input
                    this.oResHours = new JSONModel(crew_models._get_Table_2Model());
                    this.getView().setModel(this.oResHours, 'table_2');

                    this.oHeaderModel = new JSONModel(this.oHeader);
                    this.getView().setModel(this.oHeaderModel, "header");

                    // Total Hours Table data
                    this.TotalHoursData = new JSONModel(crew_models._get_TotalHoursModel());
                    this.getView().setModel(this.TotalHoursData, "tt_hours");

                    // Preserving the UI States
                    this._preserveUIStates(crew_models._get_table_11Model());

                    // Enable or disable the Copy previous day
                    if (this.is_InsidePayPeriod){
                        this.byId("_cpy_button_2").setEnabled(true);
                        if (this.bEditable) {
                            // // // Buttons after submittion
                            // this._hide_resubmitOptions(true);
                            // // this._disable_footer_resubmitOptions(true)
                            // this._enable_legends(false);

                            // // // Buttons before submittion
                            // this._hide_Footer_buttons(false)
                            this._disable_footer_buttons(false);

                            this._disable_header_actional_button(false);
                        }
                        else {
                           // // Buttons after submittion
                            // this._hide_resubmitOptions(false);
                            // // this._disable_footer_resubmitOptions(false)
                            // this._enable_legends(true);

                            // // // Buttons before submittion
                            // this._hide_Footer_buttons(true)
                            this._disable_footer_buttons(true);
                            
                            this._disable_header_actional_button(true);
                        }
                    }
                    else {
                        this.byId("_cpy_button_2").setEnabled(false);
                        this._disable_footer_buttons(true);
                        this._disable_header_actional_button(true);
                    }
                    this._disable_footer_buttons(true);
                    // this._disable_footer_resubmitOptions(true);
                    this.byId("export_1").setEnabled(false);
                    this._redetermine_SH_CO();
                    this._CloseBusyDialog();
                    MessageToast.show(`No Record(s) found`);
                }
            },

            // Promise the Take the PayCode data
            _PayCode_Promise: function (_list_PSA) {
                console.log("Fethcing PayCode Data");

                var mfilter = [];
                if(_list_PSA.length !== 0) {
                    for (let i = 0; i < _list_PSA.length; i++) {
                        const subArea = _list_PSA[i];
                        mfilter.push(new Filter({
                            path: "cust_PSA_PersonnelSubareaID",
                            operator: FilterOperator.EQ,
                            value1: subArea,
                        }));
                    }
                }
                return API_Servants._ReadData(this.oSModels, "/cust_paycode", mfilter);
            },

            // Promise to take the Job data
            _Job_Promise : function () {
                let mFilter = [];
                console.log("2.Fetching Job Data!");
                return API_Servants._ReadData(this.oBModels, "/Job_prd", mFilter);
            },

            // Promise to take the Section data
            _Section_Promise : function (_pJob) {
                var mFilter = [];
                console.log("3. Fetching Section Data");

                if(_pJob !== "") {
                    mFilter.push(new Filter({
                        path: "Jobs",
                        operator: FilterOperator.EQ,
                        value1: _pJob
                    }));
                }
                return API_Servants._ReadData(this.oBModels, "/Section_prd", mFilter);
            },

            // Promise to take the Phase data
            _Phase_Promise : function (_pSection) {
                console.log("4. Fetching Phase Data");
            
                var mFilter = [];
                if (_pSection !== "") {
                    mFilter.push(new Filter({
                        path: "Section",
                        operator: FilterOperator.EQ,
                        value1: _pSection
                    }));
                }

                return API_Servants._ReadData(this.oBModels, "/Phase_prd", mFilter);
            },

            // Promise to take the UOM data
            _UoM_Promise: function () {
                let mFilters = [];
                return API_Servants._ReadData(this.oSModels, "/cust_UOM", mFilters);
            },

            // Promise to take the WorkOrder data
            _WorkOrder_Promise: function () {
                console.log("5. Fetching Work Order Data");
                let mFilters = [];
                return API_Servants._ReadData(this.oBModels, "/WorkOrder_prd", mFilters)
            },

            // Promise to take the CostCenter data
            _CostCenter_Promise: function () {
                console.log("6. Fetching Cost Center Data");
                let mFilters = [];
                return API_Servants._ReadData(this.oSModels, "/FOCostCenter", mFilters);
            },

            // Promise to take the Company Code data
            _Company_Promise: function () {
                console.log("6. Fetching Company Data");
                let mFilters = [];
                return API_Servants._ReadData(this.oSModels, "/FOCompany", mFilters);
            },

            // Promise to take the Activities data
            _Activity_Promise: function () {
                let mFilters = [];
                return API_Servants._ReadData(this.oBModels, "/Activities_prd", mFilters);
            },

            // Promise to take the EmployeeList Data
            _get_EmployeeList_Promise : function () {
                console.log("Fetching List of Employee Data");
                let mFilters = [];
                mFilters.push(new Filter({
                    path: "Status",
                    operator: FilterOperator.EQ,
                    value1: 'Active',
                }));
                return API_Servants._ReadData(this.oBModels, "/Employees_prd", mFilters);
            },

            // Promise to take the EquipmentList Data
            _get_EquipmentList_Promise : function () {
                console.log("Fetching Equipment Lists");
                return API_Servants._ReadData(this.oBModels, "/Equipment_prd");
            },




            /*******************************************************************
            *  Factory function for tables
            *******************************************************************/
            // Table 1 - static table Factory Function
            static_factory: function (sid, oContext) {
                var aItems = [];
                aItems.push(this._generate_Input("{tabel_1>col_1}", "", true, false, "15em", ""));

                return new sap.m.ColumnListItem({
                    cells: aItems
                });
            },

            // Resource Factory function
            resource_factory: function (sid, oContext) {
                let c_row = oContext.getPath().split("/")[1],
                    aItems = [],
                    styleClass = "Employee_white",
                    oInp = this._generate_Input("{resource>col_1}", "", true, true, "11em", "res"),
                    oText = this._generate_Object_Status("{resource>col_2}");

                oInp.data("row_n", c_row);
                aItems.push(oInp);

                oText.data("row_n", c_row);
                aItems.push(oText);

                if (parseInt(c_row) < this._get_EmpCount()) {
                    styleClass = "Employee_white";
                } else if (parseInt(c_row) > this._get_EmpCount() - 1) {
                    styleClass = "Equipment_gray";
                }

                let oColListItems = new sap.m.ColumnListItem({
                                        cells: aItems
                                    }).addStyleClass(styleClass);
                oColListItems.addEventDelegate({
                    onclick : this.on_resHoverIn.bind(this)
                });
                return oColListItems;
            },

            // total Hours Static table
            static2_factory : function (sid, oContext) {
                let c_row = oContext.getPath().split("/")[1],
                    aItems = [];
                if (c_row === "0") {
                    aItems.push(this._generate_Text("{static2>col_1}"));
                } else {
                    aItems.push(this._generate_Text_Area("{static2>col_1}", "", false, "15em", sap.ui.core.TextAlign.Right, 5));
                }

                return new sap.m.ColumnListItem({
                    cells: aItems
                });
            },

            // Table 2 - Header Table - Cost Element Inputs - Factory Function
            headerInput_factory: function (sid, oContext) {
                // Get the current row number using the context object
                let c_row = oContext.getPath().split("/")[1],
                    aItems = [];
                    
                if (c_row === '0') {
                    // Generate an array of buttons for first row
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_btn('', "sap-icon://delete");
                        Input.data('col_id', i);
                        aItems.push(Input);
                    }
                } else if (c_row === '1') {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "paycode");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === '2') {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "job");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === '3') {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "section");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === '4') {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "phase");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === "5") {
                    // Generate Arrya of Inputs without value help for 7th row
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '1 Tonne', false, true, "", "qty");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === "6") {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "uom");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === "7") {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "workorder");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === "8") {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "costcenter");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === "9") {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "activity");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else if (c_row === "10") {
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "equip");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                } else {
                    // Generate an array of inputs with Value help for rest of the rows
                    for (let i = 0; i < 10; i++) {
                        let Input = this._generate_Input(`{table_11>col_${i + 1}}`, '', true, true, "", "");
                        Input.data("numb", i + 1);
                        aItems.push(Input);
                    }
                }
                // returning the result of the Factory Function
                return new sap.m.ColumnListItem({
                    cells: aItems
                });
            },

            // Hours Factory function
            hours_factory: function (sid, oContext) {
                var c_row = oContext.getPath().split("/")[1],
                    aItems = [],
                    styleClass = "Employee_white";

                for (let i = 0; i < 10; i++) {
                    // console.log(this.aHours_Tracker);
                    let bCol_flag = this.aHours_Tracker.indexOf(i + 1) !== -1 ? true : false,
                        oInput = this._generate_Hours_Input(`{table_2>col_${i + 1}}`, "", false, bCol_flag, "", "Hours");
                    oInput.data('hcol', i + 1)
                    oInput.addEventDelegate({
                        onfocusin: this.on_HourFocusIn.bind(this),
                        onsapfocusleave: this.on_HourFocusOut.bind(this)
                    });
                    aItems.push(oInput);
                }

                if (parseInt(c_row) < this._get_EmpCount()) {
                    styleClass = "Employee_white";
                } else if (parseInt(c_row) > this._get_EmpCount() - 1) {
                    styleClass = "Equipment_gray";
                }

                return new sap.m.ColumnListItem({
                    cells: aItems
                }).addStyleClass(styleClass);
            },

            // Total Hours Factory Function
            total_hours_factory: function (sid, oContext) {
                let c_row = oContext.getPath().split("/")[1],
                    aItems = [];

                if (c_row === "0") {
                    for (let i = 0; i < 10; i++) {
                        aItems.push(this._generate_Object_Status(`{tt_hours>col_${i + 1}}`));
                    }
                } else if (c_row === "1") {
                    for (let i = 0; i < 10; i++) {
                        aItems.push(this._generate_Text_Area(`{tt_hours>col_${i + 1}}`, "Comments", true, "100%", sap.ui.core.TextAlign.Initial, 300));
                    }
                }

                return new sap.m.ColumnListItem({
                    cells: aItems
                });
            },





            /*******************************************************************
            *  Event handlers
            *******************************************************************/
           // Event handler the copy the previous day data
           on_CopyPreviousDay: async function () {
                var dCurrentDate = this.getView().getModel("header").getData().date;
                let dCurDate = new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth(), dCurrentDate.getDate()),
                    dString;
                var dPreviousDate;
                // console.log("Current Date : ", dCurrentDate);
                let _moment = moment(dCurDate, "YYYY-MM-DD");

                switch (_moment.day()) {
                    case 1:
                        dCurDate.setDate(dCurDate.getDate() - 3);
                        dString = `${dCurDate.getFullYear()}-${dCurDate.getMonth() + 1}-${dCurDate.getDate()}`;
                        dPreviousDate = moment(dString, "YYYY-MM-DD").format("YYYY-MM-DD");
                        // dPreviousDate = new Date(_moment.subtract(3, 'day').format("YYYY-MM-DD"));  // taking last Friday's date
                        // console.log(dPreviousDate);
                        break;
                    default:
                        dCurDate.setDate(dCurDate.getDate() - 1);
                        dString = `${dCurDate.getFullYear()}-${dCurDate.getMonth() + 1}-${dCurDate.getDate()}`;
                        dPreviousDate = moment(dString, "YYYY-MM-DD").format("YYYY-MM-DD");
                        // dPreviousDate = new Date(_moment.subtract(1, 'day').format("YYYY-MM-DD")); // taking last day's date
                        // console.log(dPreviousDate);
                        break;
                }
                // Calling the backend Data
                try {
                    let oTime = await this._get_TimesheetDetails(dPreviousDate);
                    console.log(oTime.results);
                    // this.oCount.empCount = 0;
                    // this.oCount.equipCount = 0;
                    // this.batchArray = [];
                    // this.no_of_Cols = 1;
                    // this.aTotal_Tracker = [];
                    // this.aPaytotal_tracker = [];
                    // this.aHalfOrOne_Tracker = [];
                    // this.aOne_Tracker = [];
                    await this._prepare_ModelData(oTime.results);
                } catch (err) {
                    if (err.name === "TypeError") {
                        MessageToast.show(`${err.message}`);
                    } else if (err.statusCode && err.statusCode === 401) {
                        MessageBox.error("Please refresh the application", {
                            title : err.responseText
                        });
                    } else if(err.statusCode && err.statusCode === 404) {
                        MessageToast.show("Server Down. Try again later!");
                    } else if (err.response.statusCode && err.response.statusCode === 502) {
                        MessageToast.show("Server Down. Try again later!");
                    } else {
                        MessageToast.show("Something went wrong!!!");
                    }
                }
            },
            
            // Event to handle the Adding a Cost Element
            on_Add_CostElement: function () {
                // Take the view contoll of the cost element input table
                let oTable = this.getView().byId("_IDGenTable2");
                if (oTable.getColumns().length === 10) {
                    MessageToast.show("Cost Element Limit Reached");
                } else {
                    
                    let iNewColNumber = oTable.getColumns().length;
                    
                    // Adding a column Header to Job Table, Hours Table and Total Hours Table
                    oTable.addColumn(this._generate_Col());
                    this.getView().byId('_IDGenTable3').addColumn(this._generate_Col_Header('Hours'));
                    this.getView().byId("_IDGenTable5").addColumn(this._generate_Col(sap.ui.core.TextAlign.Begin));
                    
                    // Setting all the rows editable for the column that is added newly
                    for(let i = 1; i < 11 ; i++) 
                        oTable.getItems()[i].getCells()[iNewColNumber].setEditable(true);
                    
                    for (let j = 0; j < this.byId('_IDGenTable3').getItems().length; j++) {
                        if(this.aHours_Tracker.includes(iNewColNumber+1)) {
                            this.byId('_IDGenTable3').getItems()[j].getCells()[iNewColNumber].setEditable(true);
                        } else {
                            this.byId('_IDGenTable3').getItems()[j].getCells()[iNewColNumber].setEditable(false);
                        }
                    }
                }
            },

            // Event to handle the addition of employee
            on_AddEmployee: function () {
                if (!this._oResDialog1) {
                    Fragment.load({
                        name: "com.mgc.consprodui.consproduiprd.view.Fragments.ResList1",
                        controller: this,
                    }).then(function (oDialog) {
                        this._oResDialog1 = oDialog;
                        this.getView().addDependent(oDialog);
                        this._oResDialog1.open();
                    }.bind(this));
                } else {
                    this._oResDialog1.open();
                }
            },

            // Event to handle if the employee is selecte
            on_AddEmployee_Selected : function (oEvent) {
                var aContexts = oEvent.getParameter("selectedContexts");

                // Bind Selected Employee Data to the resource table
                if (aContexts && aContexts.length) {
                    let aResource = this.getView().getModel("resource").getData(),
                        oSelectedrec = aContexts.map(function (oContext) { return oContext.getObject(); })[0],
                        oDuplicate = aResource.find(res => res.EID === oSelectedrec.ID),
                        newData = this._get_ResTemplate();

                    if(oDuplicate === undefined) {
                        newData['col_1'] = `${oSelectedrec.ID}-${oSelectedrec.FirstName} ${oSelectedrec.LastName}`;
                        newData['EID'] = oSelectedrec.ID;
                        newData['PersonnelSubArea'] = oSelectedrec.PersonnelSubArea;
                        newData['LocationCodeDescription'] = oSelectedrec.LocationCodeDescription;
                        newData['LocationCode'] = oSelectedrec.LocationCode;
                        newData['FirstName'] = oSelectedrec.FirstName;
                        newData['LastName'] = oSelectedrec.LastName;
                        newData['FullName'] = `${oSelectedrec.FirstName} ${oSelectedrec.LastName}`;
                        newData['CompanyID'] = oSelectedrec.CompanyCode;
                        newData['CompanyName'] = oSelectedrec.CompanyName;
                        newData['OtThreshold'] = oSelectedrec.Ot_Threshold;
                        newData['OtFrequency'] = oSelectedrec.Ot_Frequency;
                        newData['Email'] = oSelectedrec.Email;
                        newData['JobTitle'] = oSelectedrec.JobTitle;
                        newData['Province'] = oSelectedrec.Province;
                        newData['ProvinceDescription'] = oSelectedrec.ProvinceDescription;
                        newData['Phone'] = oSelectedrec.Phone;

                        this.on_addResource("Employee", newData);
                        console.log("After Adding Emp Count :", this._get_EmpCount());
                    } else {
                        MessageToast.show("Resource already exist!");
                    }
                }
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event to handle the addition of Equipment
            on_AddEquipment: function () {
                if (!this._oEquipDialog1) {
                    Fragment.load({
                        name: "com.mgc.consprodui.consproduiprd.view.Fragments.EquipList1",
                        controller: this,
                    }).then(function (oDialog) {
                        this._oEquipDialog1 = oDialog;
                        this.getView().addDependent(oDialog);
                        this._oEquipDialog1.open();
                    }.bind(this));
                } else {
                    this._oEquipDialog1.open();
                }
            },

            // Event to handle if the Equipment is selected
            on_AddEquipment_Selected : function(oEvent) {
                var aSelectedItems = oEvent.getParameter("selectedItems");
                if (aSelectedItems !== undefined && aSelectedItems.length > 0) {

                    let oItem = aSelectedItems[0],
                        aResource = this.getView().getModel("resource").getData(),
                        newRecord = this._get_ResTemplate(),
                        selectedData = this.SearchHelp_original.Equipments.find(eq => eq.ID === oItem.getDescription()),
                        oDuplicate = aResource.find(res => res.EID === oItem.getDescription());
                    if(oDuplicate === undefined) {
                        newRecord.col_1 = oItem.getTitle();
                        newRecord.EID = oItem.getDescription();
                        newRecord.PermissionLevel = selectedData.PermissionLevel;
                        newRecord.Description = selectedData.Description;
                        newRecord.LastName = selectedData.LastName;
                        this.on_addResource("Equipment", newRecord);
                        console.log("After Adding Equip Count :", this._get_EquipCount());
                    } else {
                        MessageToast.show("Equipment already exists!");
                    }
                }
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event to handle the addition of Resource
            on_addResource: function (sResource_type, _data) {
                var oView = this.getView(),
                    oResModel = oView.getModel("resource").getData(),
                    oHourModel = oView.getModel("table_2").getData(),
                    oHoursTemp = this._get_HoursTemplate(),
                    oHourTable = this.byId("_IDGenTable3");

                for (let i = 0; i < oHourTable.getColumns().length; i++) {
                    // if(this.aHalfOrOne_Tracker.includes(i+1) || this.aOne_Tracker.includes(i+1)) {
                    if (this.aOne_Tracker.includes(i + 1)) {
                        oHoursTemp[`col_${i + 1}`] = "0";
                    }
                }
                    
                if (sResource_type === "Employee") {
                    // array.splice(start, deletionCount, new items)
                    oResModel.splice(this.oCount.empCount, 0, _data);
                    oHourModel.splice(this.oCount.empCount, 0, oHoursTemp);
                    this._add_employeeCount(1);
                    
                } else if (sResource_type === "Equipment") {
                    oResModel.push(_data);
                    oHourModel.push(oHoursTemp);
                    this._add_equipCount(1);
                }
                this.getView().getModel('resource').updateBindings();
                oView.getModel("table_2").updateBindings();
                if (this._get_EmpCount() !== 0 || this._get_EquipCount() !== 0) {
                    this.byId("_cpy_button_2").setEnabled(false);
                    this._disable_footer_buttons(false);
                    this._disable_footer_resubmitOptions(false);
                    this.byId("export_1").setEnabled(true);
                    this._preserve_ResourceTotalStates(oResModel);
                }
            },

            // Event to handle the date change
            on_DateChange : async function (oEvent) {
                this._BusyIndicator("Switching Date");
                console.log("Date changed");
                try {
                    await this._checkPayPeriod(oEvent.getSource().getDateValue());
                    this.oCount.empCount = 0;
                    this.oCount.equipCount = 0;
                    this.batchArray = [];
                    this.no_of_Cols = 1;
                    this.aHours_Tracker = [];
                    this.aTotal_Tracker = [];
                    this.aPaytotal_tracker = [];
                    // this.aHalfOrOne_Tracker = [];
                    this.aOne_Tracker = [];
                    this.aVisibility_Tracker = [];
                    let oTime = await this._get_TimesheetDetails(oEvent.getSource().getDateValue());
                    await this._determine_editable(oTime.results);
                    await this._prepare_ModelData(oTime.results);
                    MessageToast.show(`Switched to selected date ${moment(oEvent.getSource().getDateValue(), "DD-MM-YYYY").format("MM-DD-YYYY")}`)
                    this.getView().byId("_IDGenMenuItem6").firePress();
                    this._CloseBusyDialog();
                } catch (err) {
                    console.log(err);
                    if (err.name === "TypeError") {
                        MessageToast.show(`${err.message}`);
                    } else if (err.statusCode && err.statusCode === 401) {
                        MessageBox.error("Please refresh the application", {
                            title : err.responseText
                        });
                    } else if(err.statusCode && err.statusCode === 404) {
                        MessageToast.show("Server Down. Try again later!");
                    } else if (err.response.statusCode && err.response.statusCode === 502) {
                        MessageToast.show("Server Down. Try again later!");
                    } else {
                        MessageToast.show("Something went wrong!!!");
                    }
                    this._CloseBusyDialog();
                }
            },

            // Event to handle the menu button press
            on_MenuAction : function(oEvent) {
                let sClicked = oEvent.getSource().getText(),
                    oCEStatic = this.byId("_IDGenTable1"), // Cost Object headings
                    oCETable = this.byId("_IDGenTable2"),  // Cost Object Inputs
                    index;  

                switch(sClicked) {
                    // PayCode
                    case 'Hide PayCode' :
                        this.aVisibility_Tracker.push(1);
                        oCEStatic.getItems()[1].setVisible(false);
                        oCETable.getItems()[1].setVisible(false);

                        oEvent.getSource().setText(sClicked.replace('Hide', 'Show'));
                        oEvent.getSource().setIcon('sap-icon://show');
                    break;
                    case 'Show PayCode' :
                        if(this.aVisibility_Tracker.find(p => p === 1)) {
                            let index = this.aVisibility_Tracker.indexOf(1);
                            this.aVisibility_Tracker.splice(index, 1);
                        }
                        oCEStatic.getItems()[1].setVisible(true);
                        oCETable.getItems()[1].setVisible(true);

                        oEvent.getSource().setText(sClicked.replace('Show', 'Hide'));
                        oEvent.getSource().setIcon('sap-icon://hide');
                    break;

                    // WBS elements
                    case 'Hide WBS' :

                        for(let i = 2 ; i < 7 ; i++) {
                            this.aVisibility_Tracker.push(i);
                            oCEStatic.getItems()[i].setVisible(false);
                            oCETable.getItems()[i].setVisible(false);
                        }
                        oEvent.getSource().setText(sClicked.replace('Hide', 'Show'));
                        oEvent.getSource().setIcon('sap-icon://show');
                    break;
                    case 'Show WBS' :
                        for(let i = 2 ; i < 7 ; i++) {
                            if(this.aVisibility_Tracker.find(p => p === i)) {
                                index = this.aVisibility_Tracker.indexOf(i);
                                this.aVisibility_Tracker.splice(index, 1);
                            }
                            oCEStatic.getItems()[i].setVisible(true);
                            oCETable.getItems()[i].setVisible(true);
                        }

                        oEvent.getSource().setText(sClicked.replace('Show', 'Hide'));
                        oEvent.getSource().setIcon('sap-icon://hide');
                    break;

                    // Work Order
                    case 'Hide Work Order':
                        this.aVisibility_Tracker.push(7);

                        oCEStatic.getItems()[7].setVisible(false);
                        oCETable.getItems()[7].setVisible(false);

                        oEvent.getSource().setText(sClicked.replace('Hide', 'Show'));
                        oEvent.getSource().setIcon('sap-icon://show');
                    break;
                    case 'Show Work Order':
                        if(this.aVisibility_Tracker.find(p => p === 7)) {
                            let index = this.aVisibility_Tracker.indexOf(7);
                            this.aVisibility_Tracker.splice(index, 1);
                        }

                        oCEStatic.getItems()[7].setVisible(true);
                        oCETable.getItems()[7].setVisible(true);

                        oEvent.getSource().setText(sClicked.replace('Show', 'Hide'));
                        oEvent.getSource().setIcon('sap-icon://hide');
                    break;

                    // Cost Center
                    case 'Hide Cost Center':
                        for(let i = 8 ; i < 10 ; i++) {
                            this.aVisibility_Tracker.push(i);
                            oCEStatic.getItems()[i].setVisible(false);
                            oCETable.getItems()[i].setVisible(false);
                        }
                        oEvent.getSource().setText(sClicked.replace('Hide', 'Show'));
                        oEvent.getSource().setIcon('sap-icon://show');
                        
                    break;
                    case 'Show Cost Center':
                        for(let i = 8 ; i < 10 ; i++) {
                            if(this.aVisibility_Tracker.find(p => p === i)) {
                                index = this.aVisibility_Tracker.indexOf(i);
                                this.aVisibility_Tracker.splice(index, 1);
                            }
                            oCEStatic.getItems()[i].setVisible(true);
                            oCETable.getItems()[i].setVisible(true);
                        }

                        oEvent.getSource().setText(sClicked.replace('Show', 'Hide'));
                        oEvent.getSource().setIcon('sap-icon://hide');
                    break;

                    // Equipment
                    case 'Hide Equipment' :
                        this.aVisibility_Tracker.push(10);

                        oCEStatic.getItems()[10].setVisible(false);
                        oCETable.getItems()[10].setVisible(false);

                        oEvent.getSource().setText(sClicked.replace('Hide', 'Show'));
                        oEvent.getSource().setIcon('sap-icon://show');
                    break;
                    case 'Show Equipment' :
                        if(this.aVisibility_Tracker.find(p => p === 10)) {
                            let index = this.aVisibility_Tracker.indexOf(10);
                            this.aVisibility_Tracker.splice(index, 1);
                        }
                        oCEStatic.getItems()[10].setVisible(true);
                        oCETable.getItems()[10].setVisible(true);
                        
                        oEvent.getSource().setText(sClicked.replace('Show', 'Hide'));
                        oEvent.getSource().setIcon('sap-icon://hide');
                    break;
                    case "Hide All" :
                        let aItems1 = oEvent.getSource().getParent().getItems(),
                            iItems1 = aItems1.length;
                        for(let i = 1 ; i < 11 ; i++) {
                            if(!this.aVisibility_Tracker.includes(i)) {
                                this.aVisibility_Tracker.push(i);
                            }
                            oCEStatic.getItems()[i].setVisible(false);
                            oCETable.getItems()[i].setVisible(false);
                        }
                        for(let i = 0 ; i < iItems1-2 ; i++) {
                            aItems1[i].setText(aItems1[i].getText().replace('Hide', 'Show'));
                            aItems1[i].setIcon('sap-icon://show');
                        }
                    break;
                    case "Show All" :
                        let aItems = oEvent.getSource().getParent().getItems(),
                            iItems = aItems.length;
                        for(let i = 1 ; i < 11 ; i++) {
                            oCEStatic.getItems()[i].setVisible(true);
                            oCETable.getItems()[i].setVisible(true);
                        }
                        for(let i = 0 ; i < iItems-2 ; i++) {
                            aItems[i].setText(aItems[i].getText().replace('Show', 'Hide'));
                            aItems[i].setIcon('sap-icon://hide');
                        }
                        this.aVisibility_Tracker = [];
                    break;
                }
            },

            // Event to handle the Resource Search help
            on_ResourceHelp : function(oEvent) {
        
                let c_row = oEvent.getSource().getCustomData()[0].getValue(),
                    oField = new CustomData();
                oField.setKey('field');
                oField.setValue(oEvent.getSource().getId());

                if(parseInt(c_row) < this._get_EmpCount()) {
                    if (!this._oResDialog) {
                        Fragment.load({
                            name: "com.mgc.consprodui.consproduiprd.view.Fragments.ResList",
                            controller: this,
                        }).then(function (oDialog) {
                            this._oResDialog = oDialog;
                            this.getView().addDependent(oDialog);
                            this._oResDialog.addCustomData(oField);
                            this._oResDialog.open();
                        }.bind(this));
                    } else {
                        this._oResDialog.addCustomData(oField);
                        this._oResDialog.open();
                    }
                } else {
                    if (!this._oEquipDialog) {
                        Fragment.load({
                            name: "com.mgc.consprodui.consproduiprd.view.Fragments.EquipList",
                            controller: this,
                        }).then(function (oDialog) {
                            this._oEquipDialog = oDialog;
                            this.getView().addDependent(oDialog);
                            this._oEquipDialog.addCustomData(oField);
                            this._oEquipDialog.open();
                        }.bind(this));
                    } else {
                        this._oEquipDialog.addCustomData(oField);
                        this._oEquipDialog.open();
                    }
                }
            },

            // Event to handle the mouse Hover on the resource
            on_resHoverIn : function(oEvent) {

                if(oEvent.srcControl.getId().includes("item")) {
                    let oItem = oEvent.srcControl,
                    oView = this.getView(),
                    clickedRow = oItem.getCells()[0].getCustomData()[0].getValue(),
                    RowsData = oView.getModel('resource').getData()[clickedRow];

                    if(parseInt(clickedRow) < this._get_EmpCount()) {
                        oView.getModel('res_popover').setData(RowsData);
                        if (!this._employeePopover) {
                            this._employeePopover = Fragment.load({
                                name: "com.mgc.consprodui.consproduiprd.view.Fragments.ResPopOver",
                                controller: this
                            }).then(function(oPopover) {
                                oView.addDependent(oPopover);
                                return oPopover;
                            });
                        }
                        this._employeePopover.then(function(oPopover) {
                            oPopover.openBy(oItem);
                        });
                    } else {
                        oView.getModel('equip_popover').setData(RowsData);
                        if (!this._equipPopover) {
                            this._equipPopover = Fragment.load({
                                name: "com.mgc.consprodui.consproduiprd.view.Fragments.EquipPopOver",
                                controller: this
                            }).then(function(oPopover) {
                                oView.addDependent(oPopover);
                                return oPopover;
                            });
                        }
                        this._equipPopover.then(function(oPopover) {
                            oPopover.openBy(oItem);
                        });
                    }
                }
            },  

            on_close_PopOver : function(oEvent) {
                if(this._employeePopover) this._employeePopover.then((popover) => popover.close());
                if(this._equipPopover) this._equipPopover.then((popover) => popover.close());
            },

            // Event to handle the resource selection
            on_EmpOK : function(oEvent) {
                var aContexts = oEvent.getParameter("selectedContexts"),
                    oInputBox =  sap.ui.getCore().byId(oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length-1].getValue()),
                    iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]): "",
                    aResource = this.getView().getModel("resource").getData();

                // Bind Employee Name to the Input Box
                if (aContexts && aContexts.length) {
                    let oSelectedrec = aContexts.map(function (oContext) { return oContext.getObject(); })[0],
                        oDuplicate = aResource.find(res => res.EID === oSelectedrec.ID);
                    
                    if(oDuplicate === undefined) {
                        oInputBox.setValue(`${oSelectedrec.ID}-${oSelectedrec.FirstName} ${oSelectedrec.LastName}`);
                        aResource[iRow]['EID'] = oSelectedrec.ID;
                        aResource[iRow]['PersonnelSubArea'] = oSelectedrec.PersonnelSubArea;
                        aResource[iRow]['PersonnelSubAreaDescription'] = oSelectedrec.PersonnelSubAreaDescription;
                        aResource[iRow]['LocationCodeDescription'] = oSelectedrec.LocationCodeDescription;
                        aResource[iRow]['LocationCode'] = oSelectedrec.LocationCode;
                        aResource[iRow]['FirstName'] = oSelectedrec.FirstName;
                        aResource[iRow]['LastName'] = oSelectedrec.LastName;
                        aResource[iRow]['FullName'] = `${oSelectedrec.FirstName} ${oSelectedrec.LastName}`;
                        aResource[iRow]['CompanyID'] = oSelectedrec.CompanyCode;
                        aResource[iRow]['CompanyName'] = oSelectedrec.CompanyName;
                        aResource[iRow]['OtThreshold'] = oSelectedrec.Ot_Threshold;
                        aResource[iRow]['Email'] = oSelectedrec.Email;
                        aResource[iRow]['JobTitle'] = oSelectedrec.JobTitle;
                        aResource[iRow]['Province'] = oSelectedrec.Province;
                        aResource[iRow]['ProvinceDescription'] = oSelectedrec.ProvinceDescription;
                        aResource[iRow]['Phone'] = oSelectedrec.Phone;

                        // Remove the ValueState if any
                        if(oInputBox.getValueState() === "Error") {
                            oInputBox.setValueState(sap.ui.core.ValueState.None);
                            oInputBox.setValueStateText("");
                        }
                    } else {
                        MessageToast.show("Resource already exist!");
                    }
                }
                oEvent.getSource().removeAllCustomData();
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event for search employee details
            on_empSearch : function(oEvent) {
                let sQuery = oEvent.getParameter("value"),
                    ID = new Filter("ID", FilterOperator.Contains, sQuery),
                    FirstName = new Filter("FirstName", FilterOperator.Contains, sQuery),
                    LastName = new Filter("LastName", FilterOperator.Contains, sQuery),
                    JobTitle = new Filter("JobTitle", FilterOperator.Contains, sQuery),
                    PersonnelSubArea = new Filter("PersonnelSubArea", FilterOperator.Contains, sQuery),
                    PersonnelSubAreaDescription = new Filter("PersonnelSubAreaDescription", FilterOperator.Contains, sQuery),
                    CompanyCode = new Filter("CompanyCode", FilterOperator.Contains, sQuery),
                    CompanyName = new Filter("CompanyName", FilterOperator.Contains, sQuery),
                    LocationCodeDescription = new Filter("LocationCodeDescription", FilterOperator.Contains, sQuery),
                    mfilters = new Filter([ID, FirstName, LastName, JobTitle, PersonnelSubArea, PersonnelSubAreaDescription, CompanyCode, LocationCodeDescription, CompanyName]);

                oEvent.getParameter("itemsBinding").filter(mfilters, sap.ui.model.FilterType.Control);
            },

            // Event to handle the change of PayCode value
            on_PayCodeChange : function(oEvent){
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length-1].getValue(),
                    oHoursData = this.getView().getModel('table_2').getData(),
                    aCostElement = this.getView().getModel("table_11").getData(),
                    bflag = false;

                // if(oEvent.getSource().getValue() !== "") {

                // Determine the format for Field for the corresponding column
                let format = "0";
                // if(aCostElement[1][`pid_${iCol}`] === "1130" || aCostElement[1][`pid_${iCol}`] === "1005" ) { // if paycode is Service Incentive or Admin Incentive
                //     if(!this.aHalfOrOne_Tracker.includes(iCol)) // push if col is not tracked
                //         this.aHalfOrOne_Tracker.push(iCol);
                //     if(this.aOne_Tracker.includes(iCol))        // remove the trace for col from one tracker
                //         this.aOne_Tracker.splice(this.aOne_Tracker.indexOf(iCol), 1);
                // }
                // else 
                if (aCostElement[1][`pid_${iCol}`] === "1070" || aCostElement[1][`pid_${iCol}`] === "1225" || aCostElement[1][`pid_${iCol}`] === "1230"
                    || aCostElement[1][`pid_${iCol}`] === "BOA" || aCostElement[1][`pid_${iCol}`] === "BN" || aCostElement[1][`pid_${iCol}`] === "BT") {
                    if (!this.aOne_Tracker.includes(iCol)) // push if col is not tracked
                        this.aOne_Tracker.push(iCol);
                    // if(this.aHalfOrOne_Tracker.includes(iCol)) // remove the trace for col from half and one tracker
                    //     this.aHalfOrOne_Tracker.splice(this.aHalfOrOne_Tracker.indexOf(iCol), 1);
                }
                else { // format for time
                    format = "00:00";
                    if (this.aOne_Tracker.includes(iCol)) // remove if a col is tracked in amount tracker
                        this.aOne_Tracker.splice(this.aOne_Tracker.indexOf(iCol), 1);
                }

                for (let i = 0; i < oHoursData.length; i++) {
                    let element = oHoursData[i];

                    if (element[`id_${iCol}`] !== "") {
                        // Before swapping ids, Marking the entries with delete flag in batch operation that are available in the backend
                        var dDate = moment(this.getView().getModel("header").getData().date, "DD-MM-YYYY").format("YYYY-MM-DD"),
                            osaveModel = this.getOwnerComponent().getModel(),
                            oDataModel = new sap.ui.model.odata.ODataModel(osaveModel.sServiceUrl),
                            batchOperation;

                        batchOperation = oDataModel.createBatchOperation(`/TimeSheetDetails_prd(ID=${element[`id_${iCol}`]},AppName='CP_CREW',Date='${dDate}')`, "PATCH", { DELETED: true, SequenceNo: "" });
                        this.batchArray.push(batchOperation);
                    }

                    element[`col_${iCol}`] = format;
                    element[`id_${iCol}`] = "";
                }
                this.getView().getModel('table_2').updateBindings();
                // }

                let aHoursData = this.getView().getModel("table_2").getData(),
                    aResData = this.getView().getModel("resource").getData(),
                    aThoursData = this.getView().getModel("tt_hours").getData();;
                // Re-calculating the Total Hours in Row wise
                aResData = this._calculateEntireRowTotal_onDelete(aHoursData, aResData);
                // Re-calculating the total hours in column wise
                aThoursData = this._calculateEntireColTotal_onDelete(aHoursData, aThoursData);

                this.getView().getModel("resource").updateBindings();
                this.getView().getModel("tt_hours").updateBindings();

                // Preserving the Resource's total Hours and Total Hour's States
                this._preserve_ResourceTotalStates(this.getView().getModel('resource').getData());
                this._preserve_TotalHoursStates(aThoursData);

                // Finding out if there is any filled cost objects for the event column
                for (let i = 2; i < aCostElement.length; i++) {
                    const element = aCostElement[i];
                    if (element[`col_${iCol}`] !== "") {
                        bflag = true;
                        break;
                    }
                }

                if (aCostElement[iRow][`pid_${iCol}`] !== "") {
                    this._disable_except_specified_cost(oEvent, iCol, 1, 2, 3, 4, 5, 6, 7, 8, 9);
                    // this._disable_Hours(false, iCol-1);
                } else {
                    if (bflag)
                        this._enable_except_specified_cost(oEvent, iCol, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
                    else
                        this._enable_except_specified_cost(oEvent, iCol, 1, 2, 3, 4, 5, 6, 7, 8, 9);
                    // this._disable_Hours(true, iCol-1);
                }
            },

            // Event to handle the PayCode search help
            on_PayCodeHelp: function (oEvent) {
                var oField = new CustomData();
                oField.setKey('field');
                oField.setValue(oEvent.getSource().getId());

                if (!this._oPayCodeDialog) {
                    Fragment.load({
                        name: "com.mgc.consprodui.consproduiprd.view.Fragments.PayCodeValueHelp",
                        controller: this,
                    }).then(function (oDialog) {
                        this._oPayCodeDialog = oDialog;
                        this.getView().addDependent(oDialog);
                        this._oPayCodeDialog.addCustomData(oField);
                        this._oPayCodeDialog.open();
                    }.bind(this));
                } else {
                    this._oPayCodeDialog.addCustomData(oField);
                    this._oPayCodeDialog.open();
                }
            },

            // Event to handle if the paycode is selected
            on_PayCodeOK: function (oEvent) {

                var aSelectedItems = oEvent.getParameter("selectedItems"),
                oInputBox = sap.ui.getCore().byId(oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue()),
                iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]) : "",
                iCol = oInputBox.getCustomData()[oInputBox.getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();
                if (aSelectedItems !== undefined && aSelectedItems.length > 0) {
                    let oItem = aSelectedItems[0];
                    oInputBox.setValue(oItem.getTitle());
                    aCostElement[iRow][`pid_${iCol}`] = oItem.getDescription();
                    oInputBox.fireChange();
                }
                oEvent.getSource().removeAllCustomData();
                if (oEvent.sId === "cancel") {
                    oInputBox.setValue("");
                    aCostElement[iRow][`pid_${iCol}`] = "";
                    oInputBox.fireChange();
                }
                this.getView().getModel("table_11").updateBindings();

                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Even the handle the Job change
            on_JobChange: function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData(),
                    oSection = oEvent.getSource().getParent().getParent().getItems()[iRow + 1].getCells()[iCol - 1],
                    // oPhase = oEvent.getSource().getParent().getParent().getItems()[iRow + 2].getCells()[iCol - 1],
                    bflag = false;

                bflag = aCostElement[1][`col_${iCol}`] !== "" ? true : false;

                oSection.setValue("");
                aCostElement[iRow + 1][`sid_${iCol}`] = "";
                aCostElement[iRow + 1][`sdesc_${iCol}`] = "";
                oSection.fireChange();

                if(aCostElement[iRow][`jid_${iCol}`] !== "") {
                    this._disable_except_specified_cost(oEvent, iCol, 1, 2, 3, 4, 5, 6);
                    // this._disable_Hours(false, iCol - 1);
                } else {
                    if (bflag)
                        this._enable_except_specified_cost(oEvent, iCol, 1, 2, 3, 4, 5, 6, 10);
                    else
                        this._enable_except_specified_cost(oEvent, iCol, 1, 2, 3, 4, 5, 6);
                    // this._disable_Hours(true, iCol - 1);
                }

                this.getView().getModel("table_11").updateBindings();
            },

            // Event to handle the Job Search help
            on_JobHelp: function (oEvent) {
                var oField = new CustomData();
                oField.setKey('field');
                oField.setValue(oEvent.getSource().getId());

                if (!this._oJobDialog) {
                    Fragment.load({
                        name: "com.mgc.consprodui.consproduiprd.view.Fragments.JobValueHelp",
                        controller: this,
                    }).then(function (oDialog) {
                        this._oJobDialog = oDialog;
                        this.getView().addDependent(oDialog);
                        this._oJobDialog.addCustomData(oField);
                        this._oJobDialog.open();
                    }.bind(this));
                } else {
                    this._oJobDialog.addCustomData(oField);
                    this._oJobDialog.open();
                }
            },

            // Event to handle if the Job is selected
            on_JobOK: function (oEvent) {

                let aContexts = oEvent.getParameter("selectedContexts"),
                sInputID = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                oInputBox = sap.ui.getCore().byId(sInputID),
                iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]) : "",
                iCol = oInputBox.getCustomData()[oInputBox.getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                // Bind Job Name to the Input Box
                if (aContexts && aContexts.length) {
                    oInputBox.setValue(aContexts.map(function (oContext) { return oContext.getObject().Name; }));
                    aCostElement[iRow][`jid_${iCol}`] = aContexts.map(function (oContext) { return oContext.getObject().ID; })[0];
                    aCostElement[iRow][`pc_${iCol}`] = aContexts.map(function (oContext) { return oContext.getObject().ProfitCenter; })[0];
                    oInputBox.fireChange();

                    // Adding the column number to the Hours Tracker
                    // this.aHours_Tracker.push(iCol);

                    // Remove the ValueState if any
                    if (oInputBox.getValueState() === "Error") {
                        oInputBox.setValueState(sap.ui.core.ValueState.None);
                        oInputBox.setValueStateText("");
                    }
                }
                oEvent.getSource().removeAllCustomData();
                if (oEvent.sId === "cancel") {
                    oInputBox.setValue("");
                    aCostElement[iRow][`jid_${iCol}`] = "";
                    aCostElement[iRow][`pc_${iCol}`] = "";
                    oInputBox.fireChange();

                    // Clearing the Qty and UOM values as well
                    aCostElement[iRow + 3][`col_${iCol}`] = "";
                    aCostElement[iRow + 4][`col_${iCol}`] = "";

                    // Remove the column number from the Hours Tracker
                    this._remove_from_HoursTracker(iCol);
                    this._disable_Hours(true, iCol - 1);
                }
                this.getView().getModel("table_11").updateBindings();
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Even the handle the Section change
            on_SectionChange: function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData(),
                    oPhase = oEvent.getSource().getParent().getParent().getItems()[iRow + 1].getCells()[iCol - 1];

                oPhase.setValue("");
                aCostElement[iRow + 1][`pid_${iCol}`] = "";
                aCostElement[iRow + 1][`pdesc_${iCol}`] = "";
                oPhase.fireChange();
            },

            // Event to handle the section Search help
            on_SectionHelp: function (oEvent) {
                // console.log(oEvent);

                // To Check the Job Value is there or not
                let aCostElement = this.getView().getModel("table_11").getData(),
                    aSplit = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(aSplit[aSplit.length - 1]) - 1,
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue();

                    if (aCostElement[iRow][`jid_${iCol}`] !== "") {
                    var oField = new CustomData();
                    oField.setKey('field');
                    oField.setValue(oEvent.getSource().getId());

                    if (!this._oSecDialog) {
                        Fragment.load({
                            name: "com.mgc.consprodui.consproduiprd.view.Fragments.SectionHelp",
                            controller: this,
                        }).then(function (oSecDialog) {
                            this._oSecDialog = oSecDialog;
                            this.getView().addDependent(oSecDialog);
                            this._oSecDialog.addCustomData(oField);
                            this._oSecDialog.open();
                            this._filter_Section(aCostElement[iRow][`jid_${iCol}`]);
                        }.bind(this));
                    } else {
                        this._oSecDialog.addCustomData(oField);
                        this._oSecDialog.open();
                        this._filter_Section(aCostElement[iRow][`jid_${iCol}`]);
                    }
                } 
                else {
                    let JobInputBox = oEvent.getSource().getParent().getParent().getItems()[iRow].getCells()[iCol - 1];
                    JobInputBox.setValueState(sap.ui.core.ValueState.Error);
                    JobInputBox.setValueStateText("Job is not Selected");
                    MessageToast.show("Job is not selected!");
                }
            },

            // Event to handle if the section is selected
            on_SectionOK: function (oEvent) {

                let aContexts = oEvent.getParameter("selectedContexts"),
                    sInputID = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    oInputBox = sap.ui.getCore().byId(sInputID),
                    iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]) : "",
                    iCol = oInputBox.getCustomData()[oInputBox.getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                if (aContexts && aContexts.length) {
                    oInputBox.setValue(aContexts.map(function (oContext) { return oContext.getObject().Name; }));
                    aCostElement[iRow][`sid_${iCol}`] = aContexts.map(function (oContext) { return oContext.getObject().ID; })[0];
                    aCostElement[iRow][`sdesc_${iCol}`] = aContexts.map(function (oContext) { return oContext.getObject().Description; })[0];
                    // let mail = aContexts.map(function (oContext) { return oContext.getObject().ProjectManagerEmail; })[0];
                    // aCostElement[iRow][`mail_${iCol}`] = mail !== null && mail !== "" ? mail : aCostElement[iRow][`mail_${iCol}`];
                    oInputBox.fireChange();
                    // Remove the ValueState if any
                    if (oInputBox.getValueState() === "Error") {
                        oInputBox.setValueState(sap.ui.core.ValueState.None);
                        oInputBox.setValueStateText("");
                    }
                    // this.getView().getModel("table_11").updateBindings();
                }
                oEvent.getSource().removeAllCustomData();
                // if (oEvent.sId === "cancel") {
                //     oInputBox.setValue("");
                //     aCostElement[iRow][`sid_${iCol}`] = "";
                //     aCostElement[iRow][`sdesc_${iCol}`] = "";
                //     oInputBox.fireChange();
                //     this._disable_Hours(true, iCol - 1);  // Disable the Hours column
                //     this._remove_from_HoursTracker(iCol); // Remove from the tracker
                // }
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Even the handle the Section change
            on_PhaseChange: function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();
                   
                if (aCostElement[iRow][`pid_${iCol}`] !== "") {
                    this._disable_Hours(false, iCol - 1);
                } else {
                    this._disable_Hours(true, iCol - 1);
                }
            }, 

            // Event to handle the phase Search help
            on_PhaseHelp: function (oEvent) {
                // To Check the Job Value is there or not
                let aCostElement = this.getView().getModel("table_11").getData(),
                    aSplit = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(aSplit[aSplit.length - 1]) - 1,
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue();

                if (aCostElement[iRow][`sid_${iCol}`] !== "") {
                    var oField = new CustomData();
                    oField.setKey('field');
                    oField.setValue(oEvent.getSource().getId());

                    if (!this._oPhaseDialog) {
                        Fragment.load({
                            name: "com.mgc.consprodui.consproduiprd.view.Fragments.PhaseHelp",
                            controller: this,
                        }).then(function (oSecDialog) {
                            this._oPhaseDialog = oSecDialog;
                            this.getView().addDependent(oSecDialog);
                            this._oPhaseDialog.addCustomData(oField);
                            this._oPhaseDialog.open();
                            this._filter_Phase(aCostElement[iRow][`sid_${iCol}`]);
                        }.bind(this));
                    } else {
                        this._oPhaseDialog.addCustomData(oField);
                        this._oPhaseDialog.open();
                        this._filter_Phase(aCostElement[iRow][`sid_${iCol}`]);
                    }
                }
                else {
                    let SectionInputBox = oEvent.getSource().getParent().getParent().getItems()[iRow].getCells()[iCol - 1];
                    SectionInputBox.setValueState(sap.ui.core.ValueState.Error);
                    SectionInputBox.setValueStateText("Section is not Selected");
                    MessageToast.show("Section is not selected!");
                }
            },

            // Event to handle if the phase is selected
            on_PhaseOK: function (oEvent) {

                let aContexts = oEvent.getParameter("selectedContexts"),
                    sInputID = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    oInputBox = sap.ui.getCore().byId(sInputID),
                    iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]) : "",
                    iCol = oInputBox.getCustomData()[oInputBox.getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                if (aContexts && aContexts.length) {
                    oInputBox.setValue(aContexts.map(function (oContext) { return oContext.getObject().Name; }));
                    aCostElement[iRow][`pid_${iCol}`] = aContexts.map(function (oContext) { return oContext.getObject().ID; })[0];
                    aCostElement[iRow][`pdesc_${iCol}`] = aContexts.map(function (oContext) { return oContext.getObject().Description; })[0];
                    // let mail = aContexts.map(function (oContext) { return oContext.getObject().ProjectManagerEmail; })[0];
                    // aCostElement[iRow][`mail_${iCol}`] = mail !== null && mail !== "" ? mail : aCostElement[iRow][`mail_${iCol}`];
                    oInputBox.fireChange();
                    
                    // Adding the column number to the Hours Tracker
                    this.aHours_Tracker.push(iCol);

                    // Remove the ValueState if any
                    if (oInputBox.getValueState() === "Error") {
                        oInputBox.setValueState(sap.ui.core.ValueState.None);
                        oInputBox.setValueStateText("");
                    }
                    // this.getView().getModel("table_11").updateBindings();
                }
                oEvent.getSource().removeAllCustomData();
                                // if (oEvent.sId === "cancel") {
                //     oInputBox.setValue("");
                //     aCostElement[iRow][`pid_${iCol}`] = "";
                //     aCostElement[iRow][`pdesc_${iCol}`] = "";
                //     oInputBox.fireChange();

                //     // Remove the column number from the Hours Tracker
                //     this._remove_from_HoursTracker(iCol);
                // }
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event to handle if the Qty is given
            on_QtyChange: function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                if (aCostElement[iRow][`col_${iCol}`] === "") {
                    aCostElement[iRow + 1][`col_${iCol}`] = "";
                }
            },

            // Event to handle the uom Search help
            on_uomHelp: function (oEvent) {
                // To Check the Job Value is there or not
                let aCostElement = this.getView().getModel("table_11").getData(),
                    aSplit = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(aSplit[aSplit.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue();

                if ((aCostElement[iRow - 2][`pid_${iCol}`] !== "" || aCostElement[iRow - 3][`sid_${iCol}`] !== "" || aCostElement[iRow - 4][`jid_${iCol}`] !== "") && aCostElement[iRow - 1][`col_${iCol}`]) {
                    var oField = new CustomData();
                    oField.setKey('field');
                    oField.setValue(oEvent.getSource().getId());

                    if (!this._ouomDialog) {
                        Fragment.load({
                            name: "com.mgc.consprodui.consproduiprd.view.Fragments.UomList",
                            controller: this,
                        }).then(function (oSecDialog) {
                            this._ouomDialog = oSecDialog;
                            this.getView().addDependent(oSecDialog);
                            this._ouomDialog.addCustomData(oField);
                            this._ouomDialog.open();
                        }.bind(this));
                    } else {
                        this._ouomDialog.addCustomData(oField);
                        this._ouomDialog.open();
                    }
                }
                else {
                    MessageToast.show("WBS or Qty is missing!");
                }
            },

            // Even to handle of the uom is selected
            on_uomOK: function (oEvent) {
                var aSelectedItems = oEvent.getParameter("selectedItems"),
                oInputBox = sap.ui.getCore().byId(oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue());
                if (aSelectedItems !== undefined && aSelectedItems.length > 0) {
                    aSelectedItems.forEach(function (oItem) {
                        oInputBox.setValue(oItem.getTitle());
                        oInputBox.fireChange();
                    });
                    // this.getView().getModel("table_11").updateBindings();
                }
                oEvent.getSource().removeAllCustomData();
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event to handle the work order change
            on_workorderChange: function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData(),
                    bflag = false;

                bflag = aCostElement[1][`col_${iCol}`] !== "" ? true : false;

                if (aCostElement[iRow][`wid_${iCol}`] !== "") {
                    this._disable_except_specified_cost(oEvent, iCol, 7, 1);
                    this._disable_Hours(false, iCol - 1);
                } else {
                    if (bflag)
                        this._enable_except_specified_cost(oEvent, iCol, 7, 1, 10);
                    else
                        this._enable_except_specified_cost(oEvent, iCol, 7, 1);
                    this._disable_Hours(true, iCol - 1);
                }
            },

            // Event to handle the work order Search help
            on_workOrderHelp: function (oEvent) {
                var oField = new CustomData();
                oField.setKey('field');
                oField.setValue(oEvent.getSource().getId());

                if (!this._oWODialog) {
                    Fragment.load({
                        name: "com.mgc.consprodui.consproduiprd.view.Fragments.WorkOrderValueHelp",
                        controller: this,
                    }).then(function (oDialog) {
                        this._oWODialog = oDialog;
                        this.getView().addDependent(oDialog);
                        this._oWODialog.addCustomData(oField);
                        this._oWODialog.open();
                    }.bind(this));
                } else {
                    this._oWODialog.addCustomData(oField);
                    this._oWODialog.open();
                }
            },

            // Event to handle if the work order is selected
            on_workOrderOK: function (oEvent) {

                let aContexts = oEvent.getParameter("selectedContexts"),
                    sInputID = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    oInputBox = sap.ui.getCore().byId(sInputID),
                    iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]) : "",
                    iCol = oInputBox.getCustomData()[oInputBox.getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                // Bind Work Order Name to the Input Box
                if (aContexts && aContexts.length) {
                    let oItem = aContexts[0].getObject();

                    //Validate if the user is over-writing or entering Work order for first time
                    if (oInputBox.getValue() === "") {
                        let aHoursData = this.getView().getModel("table_2").getData(),
                            dDate = moment(this.getView().getModel("header").getData().date, "DD-MM-YYYY").format("YYYY-MM-DD"),
                            osaveModel = this.getOwnerComponent().getModel(),
                            oDataModel = new sap.ui.model.odata.ODataModel(osaveModel.sServiceUrl),
                            batchOperation;

                        // iterating only the equipment resource to nullify and add to delettion batch if ID id found
                        for (let i = this._get_EmpCount(); i < aHoursData.length; i++) {
                            if (aHoursData[i][`id_${iCol}`] !== "") {
                                console.log(`Adding to deletiong --> /TimeSheetDetails_prd(ID=${aHoursData[i][`id_${iCol}`]},AppName=CP_CREW,Date='${dDate}')`);
                                batchOperation = oDataModel.createBatchOperation(`/TimeSheetDetails_prd(ID=${aHoursData[i][`id_${iCol}`]},AppName='CP_CREW',Date='${dDate}')`, "PATCH", { DELETED: true, SequenceNo: "" });
                                this.batchArray.push(batchOperation);
                            }
                            aHoursData[i][`col_${iCol}`] = "00:00";
                            aHoursData[i][`status_${iCol}`] = "";
                        }
                        MessageToast.show(`Equipment Hours are nullified agianst new Cost Object ${oItem.Name}`, {
                            duration: 10000,
                            width: "25em",
                        });
                        this.getView().getModel("table_2").updateBindings();

                        // Re-calculating the Total Hours in Row wise
                        let aHoursData1 = this.getView().getModel("table_2").getData(),
                            aResData = this.getView().getModel("resource").getData(),
                            aThoursData = this.getView().getModel("tt_hours").getData();

                        aResData = this._calculateEntireRowTotal_onDelete(aHoursData1, aResData);
                        this.getView().getModel("resource").updateBindings();

                        // Re-calculating the Total Hours in Column wise
                        aThoursData = this._calculateEntireColTotal_onDelete(aHoursData1, aThoursData);
                        this.getView().getModel("tt_hours").updateBindings();

                        // Preserving the Resource's total Hours and Total Hours States
                        this._preserve_ResourceTotalStates(this.getView().getModel('resource').getData());
                        this._preserve_TotalHoursStates(aThoursData);
                    }                    
                    oInputBox.setValue(oItem.Name);
                    aCostElement[iRow][`wid_${iCol}`] = oItem.ID;
                    oInputBox.fireChange();

                    // Adding the column number to the Hours Tracker
                    this.aHours_Tracker.push(iCol);

                    // Remove the ValueState if any
                    if (oInputBox.getValueState() === "Error") {
                        oInputBox.setValueState(sap.ui.core.ValueState.None);
                        oInputBox.setValueStateText("");
                    }
                }
                oEvent.getSource().removeAllCustomData();
                if (oEvent.sId === "cancel") {
                    oInputBox.setValue("");
                    aCostElement[iRow][`wid_${iCol}`] = "";
                    oInputBox.fireChange();

                    // Remove the column number from the Hours Tracker
                    this._remove_from_HoursTracker(iCol);
                }
                // this.getView().getModel("table_11").updateBindings();
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event to handle the work order change
            on_costcenterChange: function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData(),
                    oActivity = oEvent.getSource().getParent().getParent().getItems()[iRow + 1].getCells()[iCol - 1],
                    bflag = false;

                bflag = aCostElement[1][`col_${iCol}`] !== "" ? true : false;

                if (aCostElement[iRow][`cid_${iCol}`] !== "") {
                    this._disable_except_specified_cost(oEvent, iCol, 8, 9, 1);
                    // this._disable_Hours(false, iCol - 1);
                } else {
                    if (bflag)
                        this._enable_except_specified_cost(oEvent, iCol, 8, 9, 1, 10);
                    else
                        this._enable_except_specified_cost(oEvent, iCol, 8, 9, 1);
                    // this._disable_Hours(true, iCol - 1);
                }

                oActivity.setValue("");
                aCostElement[iRow + 1][`aid_${iCol}`] = "";
                oActivity.fireChange();
            },

            // Event to handle the cost center Search help
            on_costCenterHelp: function (oEvent) {
                var oField = new CustomData();
                oField.setKey('field');
                oField.setValue(oEvent.getSource().getId());

                if (!this._oCCDialog) {
                    Fragment.load({
                        name: "com.mgc.consprodui.consproduiprd.view.Fragments.CostCenterValueHelp",
                        controller: this,
                    }).then(function (oDialog) {
                        this._oCCDialog = oDialog;
                        this.getView().addDependent(oDialog);
                        this._oCCDialog.addCustomData(oField);
                        this._oCCDialog.open();
                    }.bind(this));
                } else {
                    this._oCCDialog.addCustomData(oField);
                    this._oCCDialog.open();
                }
            },

            // Event to handle if the cost center is selected
            on_costCenterOK: function (oEvent) {

                let aContexts = oEvent.getParameter("selectedContexts"),
                    sInputID = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    oInputBox = sap.ui.getCore().byId(sInputID),
                    iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]) : "",
                    iCol = oInputBox.getCustomData()[oInputBox.getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                // Bind Cost Center Name to the Input Box
                if (aContexts && aContexts.length) {
                    let oItem = aContexts[0].getObject();

                    // Validate if the user is over-writing or entering Cost Center for the first time
                    if (oInputBox.getValue() === "") {
                        let aHoursData = this.getView().getModel("table_2").getData(),
                            dDate = moment(this.getView().getModel("header").getData().date, "DD-MM-YYYY").format("YYYY-MM-DD"),
                            osaveModel = this.getOwnerComponent().getModel(),
                            oDataModel = new sap.ui.model.odata.ODataModel(osaveModel.sServiceUrl),
                            batchOperation;

                        // iterating only the equipment resource to nullify and add to delettion batch if ID id found
                        for (let i = this._get_EmpCount(); i < aHoursData.length; i++) {
                            if (aHoursData[i][`id_${iCol}`] !== "") {
                                console.log(`Adding to deletiong --> /TimeSheetDetails_prd(ID=${aHoursData[i][`id_${iCol}`]},AppName=CP_CREW,Date='${dDate}')`);
                                batchOperation = oDataModel.createBatchOperation(`/TimeSheetDetails_prd(ID=${aHoursData[i][`id_${iCol}`]},AppName='CP_CREW',Date='${dDate}')`, "PATCH", { DELETED: true, SequenceNo: "" });
                                this.batchArray.push(batchOperation);
                            }
                            aHoursData[i][`col_${iCol}`] = "00:00";
                            aHoursData[i][`status_${iCol}`] = "";
                        }
                        MessageToast.show(`Equipment Hours are nullified agianst new Cost Object ${oItem.name}`, {
                            duration: 10000,
                            width: "25em",
                        });
                        this.getView().getModel("table_2").updateBindings();

                        // Re-calculating the Total Hours in Row wise
                        let aHoursData1 = this.getView().getModel("table_2").getData(),
                            aResData = this.getView().getModel("resource").getData(),
                            aThoursData = this.getView().getModel("tt_hours").getData();

                        aResData = this._calculateEntireRowTotal_onDelete(aHoursData1, aResData);
                        this.getView().getModel("resource").updateBindings();

                        // Re-calculating the Total Hours in Column wise
                        aThoursData = this._calculateEntireColTotal_onDelete(aHoursData1, aThoursData);
                        this.getView().getModel("tt_hours").updateBindings();

                        // Preserving the Resource's total Hours and Total Hours States
                        this._preserve_ResourceTotalStates(this.getView().getModel('resource').getData());
                        this._preserve_TotalHoursStates(aThoursData);
                    }

                    oInputBox.setValue(oItem.name);
                    aCostElement[iRow][`cid_${iCol}`] = oItem.costcenterExternalObjectID;
                    oInputBox.fireChange();

                    // Remove the ValueState if any
                    if (oInputBox.getValueState() === "Error") {
                        oInputBox.setValueState(sap.ui.core.ValueState.None);
                        oInputBox.setValueStateText("");
                    }
                }
                oEvent.getSource().removeAllCustomData();
                if(oEvent.sId === "cancel") {
                    oInputBox.setValue("");
                    aCostElement[iRow][`cid_${iCol}`] = "";

                    // Clearing activity value if cost center is cancelled
                    aCostElement[iRow + 1][`aid_${iCol}`] = "";
                    aCostElement[iRow + 1][`col_${iCol}`] = "";
                    oInputBox.fireChange();
                     
                    // Remove the column number from the Hours Tracker
                    this._remove_from_HoursTracker(iCol);
                }
                // this.getView().getModel("table_11").updateBindings();
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event to handle the activity change <--- Does not have any impact on the UI
            on_activityChange: function (oEvent) {
                console.log("Activity Changed - Event");
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length-1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length-1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                if (aCostElement[iRow][`aid_${iCol}`] !== "") {
                    this._disable_Hours(false, iCol - 1);
                } else {
                    this._disable_Hours(true, iCol - 1);
                }
            },

            // Event to handle the activity Search help
            on_activityHelp: function (oEvent) {

                // To check if the cost center is given or not
                let aCostElement = this.getView().getModel("table_11").getData(),
                    aSplit = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(aSplit[aSplit.length - 1]) - 1,
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue();

                    if (aCostElement[iRow][`col_${iCol}`] !== "") {
                    var oField = new CustomData();
                    oField.setKey('field');
                    oField.setValue(oEvent.getSource().getId());

                    if (!this._oActivityDialog) {
                        Fragment.load({
                            name: "com.mgc.consprodui.consproduiprd.view.Fragments.ActivityValueHelp",
                            controller: this,
                        }).then(function (oDialog) {
                            this._oActivityDialog = oDialog;
                            this.getView().addDependent(oDialog);
                            this._oActivityDialog.addCustomData(oField);
                            this._oActivityDialog.open();
                        }.bind(this));
                    } else {
                        this._oActivityDialog.addCustomData(oField);
                        this._oActivityDialog.open();
                    }
                } else {
                    let CostCenterInputBox = oEvent.getSource().getParent().getParent().getItems()[iRow].getCells()[iCol-1];
                    CostCenterInputBox.setValueState(sap.ui.core.ValueState.Error);
                    CostCenterInputBox.setValueStateText("Cost Center is not Selected");
                    MessageToast.show("Cost Center is not selected!");
                }
            },

            // Event to handle if the activity is selected
            on_acitivityOK: function (oEvent) {

                let aContexts = oEvent.getParameter("selectedContexts"),
                    sInputID = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    oInputBox = sap.ui.getCore().byId(sInputID),
                    iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]) : "",
                    iCol = oInputBox.getCustomData()[oInputBox.getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                // Bind Activity Name to the Input Box
                if (aContexts && aContexts.length) {
                    oInputBox.setValue(aContexts.map(function (oContext) { return oContext.getObject().ActivityName; }));
                    aCostElement[iRow][`aid_${iCol}`] = aContexts.map(function (oContext) { return oContext.getObject().ActivityID; })[0];
                    oInputBox.fireChange();

                    // Adding the column number to the Hours Tracker
                    this.aHours_Tracker.push(iCol);

                    // Remove the ValueState if any
                    if (oInputBox.getValueState() === "Error") {
                        oInputBox.setValueState(sap.ui.core.ValueState.None);
                        oInputBox.setValueStateText("");
                    }
                }
                oEvent.getSource().removeAllCustomData();
                // if(oEvent.sId === "cancel") {
                //     oInputBox.setValue("");
                //     aCostElement[iRow][`aid_${iCol}`] = "";
                //     oInputBox.fireChange();
                // }
                // this.getView().getModel("table_11").updateBindings();
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event to handle the Equipment change <--- Does not have any impact on the UI
            on_equipmentChange: function (oEvent) {
                console.log("Equipment Changed - Event");
                let sPath = oEvent.getSource().getParent().getBindingContextPath().split("/"),
                    iRow = parseInt(sPath[sPath.length - 1]),
                    iCol = oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData();

                if (aCostElement[iRow][`eid_${iCol}`] !== "") {
                    this._disable_except_specified_cost(oEvent, iCol, 10);
                    this._disable_Hours(false, iCol - 1);
                } else {
                    this._enable_except_specified_cost(oEvent, iCol, 10);
                    this._disable_Hours(true, iCol - 1);
                }
            },

            // Event to handle the Equipment Search help
            on_equipHelp: function (oEvent) {
                var oField = new CustomData();
                oField.setKey('field');
                oField.setValue(oEvent.getSource().getId());

                if (!this._oEquipDialog) {
                    Fragment.load({
                        name: "com.mgc.consprodui.consproduiprd.view.Fragments.EquipList",
                        controller: this,
                    }).then(function (oDialog) {
                        this._oEquipDialog = oDialog;
                        this.getView().addDependent(oDialog);
                        this._oEquipDialog.addCustomData(oField);
                        this._oEquipDialog.open();
                    }.bind(this));
                } else {
                    this._oEquipDialog.addCustomData(oField);
                    this._oEquipDialog.open();
                }
            },

            // Event to handle if the equipment is selected
            on_equipOK: function (oEvent) {
                var aSelectedItems = oEvent.getParameter("selectedItems"),
                    oInputBox = sap.ui.getCore().byId(oEvent.getSource().getCustomData()[oEvent.getSource().getCustomData().length - 1].getValue()),
                    iRow = oInputBox.getParent() !== undefined ? parseInt(oInputBox.getParent().getBindingContextPath().split("/")[1]) : "",
                    iCol = oInputBox.getCustomData()[oInputBox.getCustomData().length - 1].getValue(),
                    aCostElement = this.getView().getModel("table_11").getData(),
                    aResource = this.getView().getModel("resource").getData();
                if (aSelectedItems !== undefined && aSelectedItems.length > 0) {

                    if(typeof iCol === "number") {
                        let oItem = aSelectedItems[0];

                        // Validate if the user is over-writting or entering equipment for first time
                        if (oInputBox.getValue() === "") {
                            let aHoursData = this.getView().getModel("table_2").getData(),
                                dDate = moment(this.getView().getModel("header").getData().date, "DD-MM-YYYY").format("YYYY-MM-DD"),
                                osaveModel = this.getOwnerComponent().getModel(),
                                oDataModel = new sap.ui.model.odata.ODataModel(osaveModel.sServiceUrl),
                                batchOperation;

                            // iterating only the equipment resource to nullify and add to delettion batch if ID id found
                            for (let i = this._get_EmpCount(); i < aHoursData.length; i++) {
                                if (aHoursData[i][`id_${iCol}`] !== "") {
                                    console.log(`Adding to deletiong --> /TimeSheetDetails_prd(ID=${aHoursData[i][`id_${iCol}`]},AppName=CP_CREW,Date='${dDate}')`);
                                    batchOperation = oDataModel.createBatchOperation(`/TimeSheetDetails_prd(ID=${aHoursData[i][`id_${iCol}`]},AppName='CP_CREW',Date='${dDate}')`, "PATCH", { DELETED: true, SequenceNo: "" });
                                    this.batchArray.push(batchOperation);
                                }
                                aHoursData[i][`col_${iCol}`] = "00:00";
                                aHoursData[i][`status_${iCol}`] = "";
                            }
                            MessageToast.show(`Equipment Hours are nullified agianst new Cost Object ${oItem.getTitle()}`, {
                                duration: 10000,
                                width: "25em",
                            });
                            this.getView().getModel("table_2").updateBindings();

                            // Re-calculating the Total Hours in Row wise
                            let aHoursData1 = this.getView().getModel("table_2").getData(),
                                aResData = this.getView().getModel("resource").getData(),
                                aThoursData = this.getView().getModel("tt_hours").getData();

                            aResData = this._calculateEntireRowTotal_onDelete(aHoursData1, aResData);
                            this.getView().getModel("resource").updateBindings();

                            // Re-calculating the Total Hours in Column wise
                            aThoursData = this._calculateEntireColTotal_onDelete(aHoursData1, aThoursData);
                            this.getView().getModel("tt_hours").updateBindings();

                            // Preserving the Resource's total Hours and Total Hours States
                            this._preserve_ResourceTotalStates(this.getView().getModel('resource').getData());
                            this._preserve_TotalHoursStates(aThoursData);
                        }

                        oInputBox.setValue(oItem.getTitle());
                        aCostElement[iRow][`eid_${iCol}`] = oItem.getDescription();
                        oInputBox.fireChange();
                        // Adding the column number to the Hours Tracker
                        this.aHours_Tracker.push(iCol);
                    } else {
                        let oItem = aSelectedItems[0],
                            selectedData = this.SearchHelp_original.Equipments.find(eq => eq.ID === oItem.getDescription()),
                            oDuplicate = aResource.find(res => res.EID === oItem.getDescription());
                        if (oDuplicate === undefined) {
                            oInputBox.setValue(oItem.getTitle());
                            aResource[iRow].EID = oItem.getDescription();
                            aResource[iRow].PermissionLevel = selectedData.PermissionLevel;
                            aResource[iRow].Description = selectedData.Description;
                            aResource[iRow].LastName = selectedData.LastName;
                        } else {
                            MessageToast.show("Equipment already exists!");
                        }
                    }
                }
                oEvent.getSource().removeAllCustomData();
                if (oEvent.sId === "cancel" && typeof iCol === "number") {
                    oInputBox.setValue("");
                    aCostElement[iRow][`eid_${iCol}`] = "";
                    oInputBox.fireChange();

                    // Remove the column number from the Hours Tracker
                    this._remove_from_HoursTracker(iCol);
                }
                // this.getView().getModel("table_11").updateBindings();
                // Resetting Filter Values
                var oBItems = oEvent.getSource().getBinding("items");
                oBItems.filter([]);
            },

            // Event to handle the hours change
            on_HoursChange: function (oEvent) {
                let aCustomData = oEvent.getSource().getCustomData(),
                    aSplit = oEvent.getSource().getParent().getBindingContextPath().split('/'),
                    iRow = aSplit[aSplit.length - 1],
                    iCol = aCustomData[aCustomData.length - 1].getValue(),
                    sStr = `${iRow},${iCol}`,
                    flag = "",
                    aHoursData = this.getView().getModel("table_2").getData();

                if (oEvent.getSource().getValue() === "") {
                    // if(this.aHalfOrOne_Tracker.includes(iCol) || this.aOne_Tracker.includes(iCol) ) {
                        if (this.aOne_Tracker.includes(iCol)) {
                            oEvent.getSource().setValue("0");
                        } else {
                            oEvent.getSource().setValue("00:00");
                        }
                } else {
                    // if(this.aHalfOrOne_Tracker.includes(iCol)) { // check if the column falls under "half and one" tracker
                    //     if(oEvent.getSource().getValue() === '0' || oEvent.getSource().getValue() === '0.5' || oEvent.getSource().getValue() === '1') {
                    //         oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    //         this._determin_Row_status(iRow, sStr);
                    //         this._determin_Column_Status(iCol);
                    //     } else {
                    //         if(!this.aPaytotal_tracker.includes(sStr)) {
                    //             this.aPaytotal_tracker.push(sStr);
                    //             this._disable_footer_buttons(true);
                    //         }
                    //         oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                    //         MessageToast.show(`0, 0.5 or 1 is allowed for the selected PayCode`, { duration : 10000, width : "30em", closeOnBrowserNavigation: false  });
                    //     }
                    // } else 
                    if (this.aOne_Tracker.includes(iCol)) { // check if the column falls under "only one" tracker
                        if (oEvent.getSource().getValue() === '0' || oEvent.getSource().getValue() === '1') {
                            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                            this._determin_Row_status(iRow, sStr);
                            this._determin_Column_Status(iCol);
                        } else {
                            if (!this.aPaytotal_tracker.includes(sStr)) {
                                this.aPaytotal_tracker.push(sStr);
                                this._disable_footer_buttons(true);
                                this._disable_footer_resubmitOptions(true);
                            }
                            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                            MessageToast.show(`Either 0 or 1 is allowed for the selected PayCode`, { duration: 10000, width: "30em", closeOnBrowserNavigation: false });
                        }
                    } else {
                        // Validation for Source Hours Input Box
                        if (this._validate_Colon_Format(oEvent.getSource().getValue())) {
                            // aHoursData[iRow][`status_${iCol}`] = "Saved"; <----- Needed for editable and non-editable
                            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                            flag = ":";
                        } else {
                            // aHoursData[iRow][`status_${iCol}`] = ""; <----- Needed for editable and non-editable
                            if (!this.aTotal_Tracker.includes(sStr)) {
                                this.aTotal_Tracker.push(sStr);
                                this._disable_footer_buttons(true);
                                this._disable_footer_resubmitOptions(true);
                            }
                            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                            MessageToast.show("Use 00:00 Time Format", { duration: 10000, width: "30em", closeOnBrowserNavigation: false });
                        }
                        if (flag !== "") {
                            // calculate row wise and column wise total
                            this._calculateRowTotal(oEvent, iRow, sStr);
                            this._calculateColTotal(oEvent, iCol);
                        }
                    }
                }
            },

            // Event to handle the hours change
            on_HoursLiveChange: function (oEvent) {
            },

            // Event to handle the focus on the Hours field
            on_HourFocusIn: async function (oEvent) {
                if (oEvent.srcControl.getEditable()) {
                    let aCustomData = oEvent.srcControl.getCustomData(),
                        aSplit = oEvent.srcControl.getParent().getBindingContextPath().split('/'),
                        iRow = aSplit[aSplit.length - 1],
                        iCol = aCustomData[aCustomData.length - 1].getValue(),
                        oHeaderTable = this.getView().byId("_IDGenTable2"),
                        oResTable = this.getView().byId("_IDGenTable4"),
                        oResData = this.getView().getModel("resource").getData(),
                        aCostData = this.getView().getModel("table_11").getData();

                    // if an hour is booking for employee against a paycode, cross verifying if the employee PSA has the chosen paycode
                    if (aCostData[1][`pid_${iCol}`] !== "" && iRow < this._get_EmpCount()) {
                        let paycode_id = aCostData[1][`pid_${iCol}`],
                            psa_id = oResData[iRow]['PersonnelSubArea'],
                            aIdentified = this.aPSAs_data.filter(rec => rec.PaycodeID === paycode_id).filter(rec1 => rec1.cust_PSA_PersonnelSubareaID === psa_id);

                        if (aIdentified.length === 0) {
                            oEvent.srcControl.setEditable(false);
                            MessageToast.show(`${oResData[iRow]['FullName']} is not eligible for PayCode ${aCostData[1][`pid_${iCol}`]}(${aCostData[1][`col_${iCol}`]})`)
                        } else {
                            oEvent.srcControl.setEditable(true);
                        }
                    } else if (aCostData[1][`pid_${iCol}`] !== "" || aCostData[10][`eid_${iCol}`] !== "" ) {
                        if (iRow >= this._get_EmpCount()) {
                            oEvent.srcControl.setEditable(false);
                            MessageToast.show(`Equipment Hours cannot be booked against a PayCode and Equipment Cost Object(s)`, { duration: 8000, width: "55em" });
                        } else {
                            oEvent.srcControl.setEditable(true);
                        }
                    }
                    
                    // **************** Start of needed *****************
                    // else if (!this.bEditable && oEvent.srcControl.getValueState() === "Warning" ) {
                    //     oEvent.srcControl.setEditable(false);
                    //     MessageToast.show("Not allowed to edit entries of 'Awaiting Approval'");
                    // } else if (!this.bEditable && oEvent.srcControl.getValueState() === "None" ) {
                    //     oEvent.srcControl.setEditable(false);
                    //     MessageToast.show("Not allowed to edit entries of 'Not Submitted'");
                    // }
                    // **************** End of needed *****************
                }
            },

            // Event to handle the Focus out of the Hour Input box
            on_HourFocusOut: function (oEvent) {
                let aCustomData = oEvent.srcControl.getCustomData(),
                    iCol = aCustomData[aCustomData.length - 1].getValue();
                    if (this.aHours_Tracker.includes(iCol)) {
                    oEvent.srcControl.setEditable(true);
                }
            },

            // Determine the row Object status for the amount rows
            _determin_Row_status: function (_row, _sStr) {
                let oHourTable = this.byId("_IDGenTable3"),
                    aHoursData = this.getView().getModel("table_2").getData(),
                    oResTable = this.byId("_IDGenTable4"),
                    aResData = this.getView().getModel("resource").getData(),
                    total = 0,
                    oHour = aHoursData[Number(_row)];

                // Iterating single row's columns to find the total
                for (let j = 0; j < oHourTable.getColumns().length; j++)
                    if (!isNaN(oHour[`col_${j + 1}`]))
                        total = total + parseFloat(oHour[`col_${j + 1}`]);

                if (total === 0 && (aResData[_row].col_2 === "00:00" || aResData[_row].col_2 === "0:00")) {
                    oResTable.getItems()[_row].getCells()[1].setIcon("sap-icon://message-warning");
                    oResTable.getItems()[_row].getCells()[1].setState(sap.ui.core.ValueState.Warning);
                } else {
                    // Remove the items from tracker that has the current row number.
                    let aItemsToBeRemoved = [];
                    for (let i = 0; i < this.aPaytotal_tracker.length; i++) {
                        if (this.aPaytotal_tracker[i].includes(`${_row},`))
                            aItemsToBeRemoved.push(this.aPaytotal_tracker[i])
                    }
                    for (let i = 0; i < aItemsToBeRemoved.length; i++) {
                        this.aPaytotal_tracker.splice(this.aPaytotal_tracker.indexOf(aItemsToBeRemoved[i]), 1);
                    }
                    // Changing the state of the total hour for the current row
                    oResTable.getItems()[_row].getCells()[1].setIcon("sap-icon://time-account");
                    oResTable.getItems()[_row].getCells()[1].setState(sap.ui.core.ValueState.Success);
                }

                if (this.aPaytotal_tracker.lenght !== 0 && this.aTotal_Tracker.length !== 0) {
                    this._disable_footer_buttons(true);
                    this._alternate_disable_footer_resubmitOptions(true);
                }
                else {
                    this._disable_footer_buttons(false);
                    this._alternate_disable_footer_resubmitOptions(false);
                }
            },

            // Determine the column Object status for the amount columns
            _determin_Column_Status: function (_col) {
                console.log("Column to be checked : ", _col);
                let aHoursData = this.getView().getModel("table_2").getData(),
                    aTotalData = this.getView().getModel("tt_hours").getData(),
                    oTotalTable = this.byId("_IDGenTable5"),
                    total = 0;

                for (let i = 0; i < aHoursData.length; i++) {
                    const oHour = aHoursData[i];
                    if (!isNaN(oHour[`col_${_col}`]))
                        total = total + parseFloat(oHour[`col_${_col}`]);
                }

                // aTotalData[0][`col_${_col}`] = total.toString();
                if (total !== 0) {
                    oTotalTable.getItems()[0].getCells()[_col - 1].setIcon("sap-icon://time-account");
                    oTotalTable.getItems()[0].getCells()[_col - 1].setState(sap.ui.core.ValueState.Success);
                } else {
                    oTotalTable.getItems()[0].getCells()[_col - 1].setIcon("sap-icon://message-warning");
                    oTotalTable.getItems()[0].getCells()[_col - 1].setState(sap.ui.core.ValueState.Warning);
                }
            },

            // Calculates Row Total for the specified _row number
            _calculateRowTotal: function (oEvent, _row, _sStr) {
                let oHourTable = this.byId("_IDGenTable3"),
                    aHoursData = this.getView().getModel("table_2").getData(),
                    oResTable = this.byId("_IDGenTable4"),
                    aResData = this.getView().getModel("resource").getData(),
                    tims = 0,
                    tot,
                    oHour = aHoursData[Number(_row)],
                    bNumberflag = false;

                // iterating single row's columns to cumulate the time as total
                for (let j = 0; j < oHourTable.getColumns().length; j++) {
                    if (this._validate_Colon_Format(oHour[`col_${j + 1}`]))
                        tims = tims + this._get_Seconds_from_Time(oHour[`col_${j + 1}`], ":");

                    if (!isNaN(oHour[`col_${j + 1}`]))
                        bNumberflag = true;
                }

                tot = this._get_Hours_From_Seconds(tims);

                // Checking if the total hours per day is crossing beyond 24 hours
                let hrs = tot.split(":")[0],
                    mins = tot.split(":")[1];
                aResData[Number(_row)].col_2 = tot;
                if (hrs && parseInt(hrs) === 24 && parseInt(mins) > 0) {
                    MessageToast.show("You cannot book more than 24 hrs a day!!!");
                    if (!this.aTotal_Tracker.includes(_sStr)) {
                        this.aTotal_Tracker.push(_sStr);
                    }
                    oResTable.getItems()[_row].getCells()[1].setIcon("sap-icon://error");
                    oResTable.getItems()[_row].getCells()[1].setState(sap.ui.core.IndicationColor.Indication01);
                    this._disable_footer_buttons(true);
                    this._alternate_disable_footer_resubmitOptions(true);
                } else if (hrs && parseInt(hrs) > 24) {
                    MessageToast.show("You cannot book more than 24 hrs a day!!!");
                    if (!this.aTotal_Tracker.includes(_sStr)) {
                        this.aTotal_Tracker.push(_sStr);
                    }
                    oResTable.getItems()[_row].getCells()[1].setIcon("sap-icon://error");
                    oResTable.getItems()[_row].getCells()[1].setState(sap.ui.core.IndicationColor.Indication01);
                    this._disable_footer_buttons(true);
                    this._alternate_disable_footer_resubmitOptions(true);
                } else {
                    if (this.aTotal_Tracker.includes(_sStr))
                        this.aTotal_Tracker.splice(this.aTotal_Tracker.indexOf(_sStr), 1);

                    if (tot === "00:00" && tot === "0:00" && bNumberflag === false) {
                        oResTable.getItems()[_row].getCells()[1].setIcon("sap-icon://message-warning");
                        oResTable.getItems()[_row].getCells()[1].setState(sap.ui.core.ValueState.Warning);
                    }
                    else {
                        // Remove the items from tracker that has the current row number.
                        let aItemsToBeRemoved = [];
                        for (let i = 0; i < this.aTotal_Tracker.length; i++) {
                            if (this.aTotal_Tracker[i].includes(`${_row},`))
                                aItemsToBeRemoved.push(this.aTotal_Tracker[i])
                        }
                        for (let i = 0; i < aItemsToBeRemoved.length; i++) {
                            this.aTotal_Tracker.splice(this.aTotal_Tracker.indexOf(aItemsToBeRemoved[i]), 1);
                        }
                        // Changing the state of the total hour for the current row
                        oResTable.getItems()[_row].getCells()[1].setIcon("sap-icon://time-account");
                        oResTable.getItems()[_row].getCells()[1].setState(sap.ui.core.ValueState.Success);
                    }

                    if (this.aTotal_Tracker.length !== 0 && this.aPaytotal_tracker.lenght !== 0) {
                        this._disable_footer_buttons(true);
                        this._alternate_disable_footer_resubmitOptions(true);
                    }
                    else {
                        this._disable_footer_buttons(false);
                        this._alternate_disable_footer_resubmitOptions(false);
                    }  
                }
                this.getView().getModel("resource").updateBindings();
            },

            // Calculates Column Total for the specified _col number
            _calculateColTotal: function (oEvent, _col) {
                let aHoursData = this.getView().getModel("table_2").getData(),
                    aTotalData = this.getView().getModel("tt_hours").getData(),
                    oTotalTable = this.byId("_IDGenTable5"),
                    tims = 0,
                    tot;

                for (let i = 0; i < aHoursData.length; i++) {
                    const oHour = aHoursData[i];
                    if (this._validate_Colon_Format(oHour[`col_${_col}`]))
                        tims = tims + this._get_Seconds_from_Time(oHour[`col_${_col}`], ":");
                }

                tot = this._get_Hours_From_Seconds(tims);
                aTotalData[0][`col_${_col}`] = tot;

                if (tot === "00:00") {
                    oTotalTable.getItems()[0].getCells()[_col - 1].setIcon("sap-icon://message-warning");
                    oTotalTable.getItems()[0].getCells()[_col - 1].setState(sap.ui.core.ValueState.Warning);
                }
                else {
                    oTotalTable.getItems()[0].getCells()[_col - 1].setIcon("sap-icon://time-account");
                    oTotalTable.getItems()[0].getCells()[_col - 1].setState(sap.ui.core.ValueState.Success);
                }

                this.getView().getModel("tt_hours").updateBindings();
            },

            // Calculates Row Total for the entire table
            _calculateEntireRowTotal: function (_aHoursData, _ResData) {
                for (let i = 0; i < _aHoursData.length; i++) {
                    let oHour = _aHoursData[i],
                        rtims = 0,
                        rtot = 0;
                    for (let j = 0; j < this.no_of_Cols; j++) {
                        if (this._validate_Colon_Format(oHour[`col_${j + 1}`]))
                            rtims = rtims + this._get_Seconds_from_Time(oHour[`col_${j + 1}`], ":");
                    }

                    rtot = this._get_Hours_From_Seconds(rtims);
                    _ResData[i].col_2 = rtot;
                }
                return _ResData;
            },

            // Calculates Column Total for the entire table
            _calculateEntireColTotal: function (_aHoursData, _t_hours) {
                for (let j = 0; j < this.no_of_Cols; j++) {
                    let ctims = 0,
                        ctot = 0;
                    for (let i = 0; i < _aHoursData.length; i++) {
                        let oHour = _aHoursData[i];
                        if (this._validate_Colon_Format(oHour[`col_${j + 1}`]))
                            ctims = ctims + this._get_Seconds_from_Time(oHour[`col_${j + 1}`], ":");
                    }
                    ctot = this._get_Hours_From_Seconds(ctims);
                    _t_hours[0][`col_${j + 1}`] = ctot;
                }
                return _t_hours;
            },

            // Calculates Row Total for the entire table on deleting the columns
            _calculateEntireRowTotal_onDelete: function (_aHoursData, _ResData) {
                let oHoursTable = this.byId("_IDGenTable3");
                for (let i = 0; i < _aHoursData.length; i++) {
                    let oHour = _aHoursData[i],
                        rtims = 0,
                        rtot = 0;
                    for (let j = 0; j < oHoursTable.getColumns().length; j++) {
                        if (this._validate_Colon_Format(oHour[`col_${j + 1}`]))
                            rtims = rtims + this._get_Seconds_from_Time(oHour[`col_${j + 1}`], ":");
                    }

                    rtot = this._get_Hours_From_Seconds(rtims);
                    _ResData[i].col_2 = rtot;
                }
                return _ResData;
            },

            // Calculates Column Total for the entire tableon deleting a row
            _calculateEntireColTotal_onDelete: function (_aHoursData, _t_hours) {
                let oHoursTable = this.byId("_IDGenTable3");
                for (let j = 0; j < oHoursTable.getColumns().length; j++) {
                    let ctims = 0,
                        ctot = 0;
                    for (let i = 0; i < _aHoursData.length; i++) {
                        let oHour = _aHoursData[i];
                        if (this._validate_Colon_Format(oHour[`col_${j + 1}`]))
                            ctims = ctims + this._get_Seconds_from_Time(oHour[`col_${j + 1}`], ":");
                    }
                    ctot = this._get_Hours_From_Seconds(ctims);
                    _t_hours[0][`col_${j + 1}`] = ctot;
                }
                return _t_hours;
            },

            // Filters the SEction data based on the chosen Job data
            _filter_Section: function (_pJob) {
                this._oSecDialog.setBusy(true);
                let aSearchData = this.getView().getModel("searchHelp").getData();
                aSearchData.Sections = this.SearchHelp_original.Sections.filter((section) => section.Jobs === _pJob);
                this.getView().getModel("searchHelp").updateBindings();
                this._oSecDialog.setBusy(false);
            },

            // Filters the Phase Data based on the chosen Section data
            _filter_Phase: function (_pSection) {
                this._oPhaseDialog.setBusy(true);
                let aSearchData = this.getView().getModel("searchHelp").getData();
                aSearchData.Phases = this.SearchHelp_original.Phases.filter((phase) => phase.Section === _pSection);
                this.getView().getModel("searchHelp").updateBindings();
                this._oPhaseDialog.setBusy(false);
            },

            // Event to handle the PayCode search
            on_PayCodeSearch: function (oEvent) {
                let sQuery = oEvent.getParameter("value"),
                    PaycodeName = new Filter("PaycodeName", FilterOperator.Contains, sQuery),
                    PaycodeID = new Filter("PaycodeID", FilterOperator.Contains, sQuery),
                    mfilters = new Filter([PaycodeName, PaycodeID]);

                oEvent.getParameter("itemsBinding").filter(mfilters, sap.ui.model.FilterType.Control);
            },

            // Event to handle the Cost Center search
            on_CostCenterSearch: function (oEvent) {
                let sQuery = oEvent.getParameter("value"),
                    costcenterExternalObjectID = new Filter("costcenterExternalObjectID", FilterOperator.Contains, sQuery),
                    name = new Filter("name", FilterOperator.Contains, sQuery),
                    legalEntity = new Filter("legalEntity", FilterOperator.Contains, sQuery),
                    CompanyDescription = new Filter("CompanyDescription", FilterOperator.Contains, sQuery),
                    mfilters = new Filter([costcenterExternalObjectID, name, legalEntity, CompanyDescription]);

                oEvent.getParameter("itemsBinding").filter(mfilters, sap.ui.model.FilterType.Control);
            },

            // Event to handle liveSearch of Data
            on_liveSearch: function (oEvent) {
                let sQuery = oEvent.getParameter("value"),
                    ID = new Filter("ID", FilterOperator.Contains, sQuery),
                    Name = new Filter("Name", FilterOperator.Contains, sQuery),
                    Description = new Filter("Description", FilterOperator.Contains, sQuery),
                    ProjectManager = new Filter("ProjectManager", FilterOperator.Contains, sQuery),
                    CompanyDescription = new Filter("CompanyDescription", FilterOperator.Contains, sQuery),
                    ProfitCenter = new Filter("ProfitCenter", FilterOperator.Contains, sQuery),
                    mfilters = new Filter([ID, Name, Description, ProjectManager, CompanyDescription, ProfitCenter]);

                oEvent.getParameter("itemsBinding").filter(mfilters, sap.ui.model.FilterType.Control);
            },

            // Event to handle Equipment Search
            on_EquipSearch: function (oEvent) {
                let sQuery = oEvent.getParameter("value"),
                    ID = new Filter("ID", FilterOperator.Contains, sQuery),
                    LastName = new Filter("LastName", FilterOperator.Contains, sQuery),
                    mfilters = new Filter([ID, LastName]);

                oEvent.getParameter("itemsBinding").filter(mfilters, sap.ui.model.FilterType.Control);
            },

            // Event to handle UoM Search
            on_UOM_Search: function (oEvent) {
                let sQuery = oEvent.getParameter("value"),
                    e_code = new Filter("externalCode", FilterOperator.Contains, sQuery),
                    e_name = new Filter("externalName", FilterOperator.Contains, sQuery),
                    mfilters = new Filter([e_code, e_name]);

                oEvent.getParameter("itemsBinding").filter(mfilters, sap.ui.model.FilterType.Control);
            },

            // Event to handle Work Order Search
            on_WorkorderSearchValue: function (oEvent) {
                let sQuery = oEvent.getParameter("value"),
                    ID = new Filter("ID", FilterOperator.Contains, sQuery),
                    Name = new Filter("Name", FilterOperator.Contains, sQuery),
                    CompanyCode = new Filter("CompanyCode", FilterOperator.Contains, sQuery),
                    CompanyCodeDescription = new Filter("CompanyCodeDescription", FilterOperator.Contains, sQuery),
                    mfilters = new Filter([ID, Name, CompanyCode, CompanyCodeDescription]);

                oEvent.getParameter("itemsBinding").filter(mfilters, sap.ui.model.FilterType.Control);
            },

            on_ActivitySearchValue: function (oEvent) {
                let sQuery = oEvent.getParameter("value"),
                    ActivityID = new Filter("ActivityID", FilterOperator.Contains, sQuery),
                    ActivityName = new Filter("ActivityName", FilterOperator.Contains, sQuery),
                    mfilters = new Filter([ActivityID, ActivityName]);

                oEvent.getParameter("itemsBinding").filter(mfilters, sap.ui.model.FilterType.Control);
            },

            // Event ot handle the deletion of Cost Element
            on_Delete_Btn_Press: function (oEvent) {
                // console.log(oEvent);
                let aResData = this.getView().getModel("resource").getData();
                // Get the header Table Control
                var oTable = this.getView().byId('_IDGenTable2'); // get the Cost Elemet Table controller
                var aCols = oTable.getColumns();  // Get the columns
                var nTotal_cols = aCols.length;   // Take number of columns

                // get the employee hours table control
                var oEmpTable = this.getView().byId('_IDGenTable3'); // get the Employee Hours Table object
                var aEmpCols = oEmpTable.getColumns(); // Get the columns
                var nEmp_total_cols = aEmpCols.length; // Take number of columns

                // get the total hours Table control
                var oTotalHrsTable = this.getView().byId("_IDGenTable5");
                var aTcols = oTotalHrsTable.getColumns();
                var nTCols = aTcols.length;

                var nSelectedCol = oEvent.getSource().getCustomData()[0].getValue(); // get the selected column to be deleted

                if (nTotal_cols === 1) {
                    MessageToast.show("Minimum no.of Cost Element is 1");
                } else {
                    // Getting the table data
                    var dHeaderData = this.getView().getModel('table_11').getData();        // get the Cost Element original data
                    var dEmpData = this.getView().getModel('table_2').getData();            // get the Employee Hours original data
                    var dTotalHoursData = this.getView().getModel('tt_hours').getData();    // get the Total Hours Original data

                    let col_keys = [],
                        id_keys = [],
                        mail_keys = [],
                        desc_keys = [],
                        status_keys = [];

                    // Swapping columns of Cost Element Table
                    for (let i = 1; i < dHeaderData.length; i++) { // iterating the array
                        const element = dHeaderData[i];
                        // Take the object keys in an array and the length
                        let element_keys = Object.keys(element);

                        col_keys = [];
                        id_keys = [];
                        mail_keys = []; // <-- May not be needed
                        desc_keys = [];
                        status_keys = [];
                        // Object key segregating to avoid unwanted overlap
                        switch (i) {
                            case 1:    // splitting object keys for PayCode row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("pid_"))
                                        id_keys.push(element_keys[k]);
                                }
                                break;
                            case 2:    // splitting object keys for Job row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("jid_"))
                                        id_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("pc_"))
                                        desc_keys.push(element_keys[k]);
                                    else
                                        mail_keys.push(element_keys[k]);
                                }
                                break;
                            case 3: // splitting object keys for Section row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("sid_"))
                                        id_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("sdesc_"))
                                        desc_keys.push(element_keys[k]);
                                    else
                                        mail_keys.push(element_keys[k]);
                                }
                                break;
                            case 4: // splitting object keys for Phase row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("pid_"))
                                        id_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("pdesc_"))
                                        desc_keys.push(element_keys[k]);
                                    else
                                        mail_keys.push(element_keys[k]);
                                }
                                break;
                            case 5: // splitting object keys for Qty row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else
                                        id_keys.push(element_keys[k]);
                                }
                                break;
                            case 6: // splitting object keys for UoM row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else
                                        id_keys.push(element_keys[k]);
                                }
                                break;
                            case 7: // splitting object keys for Work Order row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("wid_"))
                                        id_keys.push(element_keys[k]);
                                    else
                                        mail_keys.push(element_keys[k]);
                                }
                                break;
                            case 8: // splitting object keys for Cost Center row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("cid_"))
                                        id_keys.push(element_keys[k]);
                                    else
                                        mail_keys.push(element_keys[k]);
                                }
                                break;
                            case 9: // splitting object keys for Activity row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("aid_"))
                                        id_keys.push(element_keys[k]);
                                    else
                                        mail_keys.push(element_keys[k]);
                                }
                                break;
                            case 10: // splitting object keys for Equipment row
                                for (const k in element_keys) {
                                    if (element_keys[k].includes("col_"))
                                        col_keys.push(element_keys[k]);
                                    else if (element_keys[k].includes("eid_"))
                                        id_keys.push(element_keys[k]);
                                    else
                                        mail_keys.push(element_keys[k]);
                                }
                                break;
                        }

                        if (col_keys.length !== 0) {
                            // iterating the col object keys
                            for (const key in col_keys) {

                                // Start swapping from the selected index
                                if (nSelectedCol <= parseInt(key)) {
                                    // Take the currect index, next index of the element object
                                    let next_index = element_keys.indexOf(col_keys[key]) + 1;

                                    // Copying next index key value to the current key index value
                                    if (key !== "9" && element.hasOwnProperty(col_keys[key])) {
                                        element[col_keys[key]] = element[element_keys[next_index]];
                                    } else {  // If reached last index
                                        element[col_keys[key]] = "";
                                    }
                                }
                            }
                        }

                        if (id_keys.length !== 0) {
                            // iterating the id object keys
                            for (const key in id_keys) {

                                // Start swapping from the selected index
                                if (nSelectedCol <= parseInt(key)) {
                                    // Take the currect index, next index of the element object
                                    let next_index = element_keys.indexOf(id_keys[key]) + 1;

                                    // Copying next index key value to the current key index value
                                    // if (key !== "9" && element.hasOwnProperty(id_keys[key]) && (cur_index + 1) < ttl_keys) {
                                    if (key !== "9" && element.hasOwnProperty(id_keys[key])) {
                                        element[id_keys[key]] = element[element_keys[next_index]];
                                    } else {  // If reached last index
                                        element[id_keys[key]] = "";
                                    }
                                }
                            }
                        }

                        if (desc_keys.length !== 0) {
                            // iterating the id object keys
                            for (const key in desc_keys) {

                                // Start swapping from the selected index
                                if (nSelectedCol <= parseInt(key)) {
                                    // Take the currect index, next index of the element object
                                    // let cur_index = element_keys.indexOf(desc_keys[key]);
                                    let next_index = element_keys.indexOf(desc_keys[key]) + 1;

                                    // Copying next index key value to the current key index value
                                    if (key !== "9" && element.hasOwnProperty(desc_keys[key])) {
                                        element[desc_keys[key]] = element[element_keys[next_index]];
                                    } else {  // If reached last index
                                        element[desc_keys[key]] = "";
                                    }
                                }
                            }
                        }

                        if (mail_keys.length !== 0) {
                            // iterating the id object keys
                            for (const key in mail_keys) {

                                // Start swapping from the selected index
                                if (nSelectedCol <= parseInt(key)) {
                                    // Take the currect index, next index of the element object
                                    let next_index = element_keys.indexOf(mail_keys[key]) + 1;

                                    // Copying next index key value to the current key index value
                                    if (key !== "9" && element.hasOwnProperty(mail_keys[key])) {
                                        element[mail_keys[key]] = element[element_keys[next_index]];
                                    } else {  // If reached last index
                                        element[mail_keys[key]] = "";
                                    }
                                }
                            }
                        }
                    }

                    // Swapping the columns of Hours Table
                    for (let i = 0; i < dEmpData.length; i++) {
                        const element = dEmpData[i];
                        // Take the object keys in an array and the length
                        let element_keys = Object.keys(element);

                        col_keys = [];
                        id_keys = [];
                        status_keys = [];

                        for (const k in element_keys) {
                            if (element_keys[k].includes("col_"))
                                col_keys.push(element_keys[k]);
                            else if (element_keys[k].includes("id_"))
                                id_keys.push(element_keys[k]);
                            else
                                status_keys.push(element_keys[k]);
                        }

                        if (col_keys.length !== 0) {
                            // iterating the col object keys
                            for (const key in col_keys) {

                                // Start swapping from the selected index
                                if (nSelectedCol <= parseInt(key)) {
                                    // Take the currect index, next index of the element object
                                    let next_index = element_keys.indexOf(col_keys[key]) + 1;

                                    // Copying next index key value to the current key index value
                                    if (key !== "9" && element.hasOwnProperty(col_keys[key])) {
                                        element[col_keys[key]] = element[element_keys[next_index]];
                                    } else {  // If reached last index
                                        element[col_keys[key]] = "00:00";
                                    }
                                }
                            }
                        }

                        if (id_keys.length !== 0) {
                            // iterating the id object keys
                            for (const key in id_keys) {

                                // Before swapping ids, Marking the entries with delete flag in batch operation that are available in the backend
                                if (element[id_keys[key]] && id_keys[key] === `id_${nSelectedCol + 1}` && element[id_keys[key]] !== "") {
                                    
                                    var dDate = moment(this.getView().getModel("header").getData().date, "DD-MM-YYYY").format("YYYY-MM-DD"),
                                        osaveModel = this.getOwnerComponent().getModel(),
                                        oDataModel = new sap.ui.model.odata.ODataModel(osaveModel.sServiceUrl),
                                        batchOperation;

                                        batchOperation = oDataModel.createBatchOperation(`/TimeSheetDetails_prd(ID=${element[id_keys[key]]},AppName='CP_CREW',Date='${dDate}')`, "PATCH", { DELETED : true, SequenceNo : "" });
                                    this.batchArray.push(batchOperation);
                                }

                                // Start swapping from the selected index
                                if (nSelectedCol <= parseInt(key)) {
                                    // Take the currect index, next index of the element object
                                    let next_index = element_keys.indexOf(id_keys[key]) + 1;

                                    // Copying next index key value to the current key index value
                                    if (key !== "9" && element.hasOwnProperty(id_keys[key])) {
                                        element[id_keys[key]] = element[element_keys[next_index]];
                                    } else {  // If reached last index
                                        element[id_keys[key]] = "";
                                    }
                                }
                            }
                        }
                    }

                    // Swapping the columns for Total Hours Table
                    for (let i = 0; i < dTotalHoursData.length; i++) {
                        const element = dTotalHoursData[i];
                        // Take the object keys in an array and the length
                        let element_keys = Object.keys(element);
                        let ttl_keys = element_keys.length;

                        for (const key in element) { // iterating the object

                            // Start swapping from the selected index
                            if (nSelectedCol <= element_keys.indexOf(key)) {
                                // Take the currect index, next index of the element object
                                let cur_index = element_keys.indexOf(key);
                                let next_index = element_keys.indexOf(key) + 1;

                                // Copying next index key value to the current key index value
                                if (element.hasOwnProperty(key) && (cur_index + 1) < ttl_keys) {
                                    element[key] = element[element_keys[next_index]];
                                } else {  // If reached last index
                                    switch (i) {
                                        case 0: element[key] = "00:00"; break;
                                        case 1: element[key] = ""; break;
                                    }
                                }
                            }
                        }
                    }

                    // Updating the bindings of the tables with new changes
                    oTable.getModel("table_11").updateBindings();
                    oEmpTable.getModel("table_2").updateBindings();
                    oTotalHrsTable.getModel('tt_hours').updateBindings();

                    // Redetermine the show/hide cost object rows
                    this._redetermine_SH_CO();

                    // Updating the Hours Tracker
                    this._update_hours_tracker(nSelectedCol);

                    // Re-Determine the Validation of the cost objects
                    this._Determine_Validation(dHeaderData, oTable.getColumns().length, nSelectedCol);

                    // Delete the column at the last from the Cost Element Table and Hours Table
                    oTable.removeColumn(aCols[nTotal_cols - 1]);
                    oEmpTable.removeColumn(aEmpCols[nEmp_total_cols - 1]);
                    oTotalHrsTable.removeColumn(aTcols[nTCols - 1]);

                    // Re-calculating the Total Hours in Row wise
                    let aHoursData = this.getView().getModel("table_2").getData(),
                        aResData = this.getView().getModel("resource").getData();

                        aResData = this._calculateEntireRowTotal_onDelete(aHoursData, aResData);
                    this.getView().getModel("resource").updateBindings();

                    // Updating thee colors of object Status text
                    this._preserve_ResourceTotalStates(aResData);
                    this._preserve_TotalHoursStates(this.getView().getModel('tt_hours').getData());

                }
            },

            // Event to handle the Deletion of resources in the resource table
            on_DeleteResource: function () {
                var oTable = this.getView().byId("_IDGenTable4");
                oTable.setBusyIndicatorDelay(0);
                oTable.setBusy(true);
                let oView = this.getView(),
                    aRecordToBeDeleted = [],
                    aTableData = oTable.getModel("resource").getData(),
                    aContexts = oTable.getSelectedContexts(),
                    tableData = this.getView().getModel("resource").getData(),
                    aHrsData = oView.getModel("table_2").getData(),
                    selected = oTable.getSelectedItems(),
                    iEmpCount = 0,
                    iEquipCount = 0;

                if (selected.length === 0) {
                    let msg = "No record(s) selected!";
                    MessageToast.show(msg, { duration: 10000, width: "30em", closeOnBrowserNavigation: false });
                } else {
                    for (let i = aContexts.length - 1; i >= 0; i--) {
                        let oThisObj = aContexts[i].getObject(),
                            iIndex = $.map(aTableData, function (obj, index) {
                                if (obj === oThisObj) {
                                    return index;
                                }
                            });
                        aRecordToBeDeleted.push(aHrsData[iIndex]);
                        tableData.splice(iIndex, 1)
                        aHrsData.splice(iIndex, 1);

                        if (iIndex < this._get_EmpCount()) {
                            iEmpCount = iEmpCount + 1;
                        } else {
                            iEquipCount = iEquipCount + 1;
                        }
                    }

                    this._minus_empCount(iEmpCount);
                    this._minus_equipCount(iEquipCount);
                    oTable.removeSelections();

                    if (aRecordToBeDeleted.length !== 0) {
                        var dDate = moment(this.getView().getModel("header").getData().date, "DD-MM-YYYY").format("YYYY-MM-DD"),
                            osaveModel = this.getOwnerComponent().getModel(),
                            oDataModel = new sap.ui.model.odata.ODataModel(osaveModel.sServiceUrl),
                            batchOperation;

                        for (let i = 0; i < aRecordToBeDeleted.length; i++) {
                            for (const key in aRecordToBeDeleted[i]) {
                                if (key.includes("id_") && key === key.replace("col_", "id_") && aRecordToBeDeleted[i][key.replace("col_", "id_")] !== "") {
                                    console.log(aRecordToBeDeleted[i][key.replace("col_", "id_")]);
                                    console.log(`/TimeSheetDetails_prd(ID=${aRecordToBeDeleted[i][key.replace("col_", "id_")]},AppName=CP_CREW,Date='${dDate}')`);
                                    batchOperation = oDataModel.createBatchOperation(`/TimeSheetDetails_prd(ID=${aRecordToBeDeleted[i][key.replace("col_", "id_")]},AppName='CP_CREW',Date='${dDate}')`, "PATCH", { DELETED: true, SequenceNo: "" });
                                    this.batchArray.push(batchOperation);
                                }
                            }
                        } 
                    }

                    oView.getModel("resource").updateBindings();
                    oView.getModel("table_2").updateBindings();

                    // Re-calculating the Total Hours in Column wise
                    let aHoursData = oView.getModel("table_2").getData(),
                        aThoursData = oView.getModel("tt_hours").getData();

                        aThoursData = this._calculateEntireColTotal_onDelete(aHoursData, aThoursData);
                    oView.getModel("tt_hours").updateBindings();

                    // Preserving the Resource's total Hours and Total Hours States
                    this._preserve_ResourceTotalStates(this.getView().getModel('resource').getData());
                    this._preserve_TotalHoursStates(aThoursData);

                    // Enable Copy Previous Data button if table has no data
                    if (aTableData.length === 0 && (!this.byId("_cpy_button_2").getEnabled())) {
                        this.byId("_cpy_button_2").setEnabled(true);
                        this._disable_footer_buttons(true);
                        this.byId("export_1").setEnabled(false);
                    }
                }
                oTable.setBusy(false);

            },

            // Event to handle the downloading of Excel file
            on_Download_Excel: function () {
                let payloadData = this._get_convertedPayload("Not Saved");

                if (payloadData.length !== 0) {
                    let mSettings = this._get_excelSettings(payloadData),
                        oSpreadsheet = new Spreadsheet(mSettings);
                    try {
                        oSpreadsheet.build();
                    } catch (err) {
                        console.log(err);
                        MessageToast.show("Error in downloading Excel sheet!");
                    }
                    MessageToast.show("Excel Downloaded Successfully!")
                } else {
                    MessageToast.show("No Hours has been entered against any Cost Objects");
                }
            },

            // Event to handle the Cencel button Click
            on_Cancel: function (oEvent) {
                location.reload();
            },

            on_live_TextArea : function(oEvent) {
                let _text = oEvent.getSource().getValue();
                if(oEvent.getSource().getMaxLength() <= _text.length) {
                    oEvent.getSource().setShowExceededText(false);
                } else {
                    oEvent.getSource().setShowExceededText(true);
                }
            },

            // Event to handle Submitting the data
            on_Submit: async function (oEvent) {
                await this._check_Hours_Column();

                var sBtnText = oEvent.getSource().getText() === "Save" ? "Saved" : "Awaiting Approval";
                this._BusyIndicator(sBtnText === "Saved" ? "Saving Timesheet details" : "Submitting Timesheet Details");
                var payLoad = this._get_convertedPayload(sBtnText),
                    osaveModel = this.getOwnerComponent().getModel(),
                    oDataModel = new sap.ui.model.odata.ODataModel(osaveModel.sServiceUrl),
                    oDate = this.getView().getModel("header").getData().date;

                let batch = [];
                console.log(payLoad);

                if (payLoad.length !== 0 || this.batchArray.length !== 0) {
                    batch = this._prepare_batch(payLoad, oDataModel);
                    oDataModel.addBatchChangeOperations(batch);
                    console.log("Batch Array : ", batch);

                    switch (sBtnText) {
                        case "Saved":
                            // Do only Save
                            try {
                                let _saveRes = await API_Servants._SubmitBatchData(oDataModel);
                                console.log(_saveRes);
                                MessageToast.show("Timesheet Saved Successfully!");

                                // Preparing for RT OT calculation
                                if(_saveRes.length !== 0) {
                                    for (let l = 0; l < payLoad.length; l++) {
                                        const element = payLoad[l];
                                        if(payLoad[l].EmployeeID !== "") {
                                            let oParams = { EmployeeID: element.EmployeeID,
                                                            PayPeriodBeginDate: element.PayPeriodBeginDate,
                                                            PayPeriodEndDate: element.PayPeriodEndDate,
                                                            OtFrequency : element.OtFrequency,
                                                            Date : element.Date,
                                                            AppName: 'CP_CREW' };

                                            // Calculating RT OT
                                            let rt_ot_result = await API_Servants._calculate_RT_OT(this.oBModels, "/RTOTCalulation", oParams);
                                            console.log("RT OT Result : ", rt_ot_result)
                                        }
                                    }
                                }

                                this.batchArray = [];
                                this.oCount.empCount = 0;
                                this.oCount.equipCount = 0;
                                this.aHours_Tracker = [];
                                this.aTotal_Tracker = [];
                                this.aPaytotal_tracker = [];
                                // this.aHalfOrOne_Tracker = [];
                                this.aOne_Tracker = [];
                                this._CloseBusyDialog();
                                let _saved = await this._get_TimesheetDetails(oDate);
                                this._prepare_ModelData(_saved.results);
                            } catch (err) {
                                console.log(err);
                                if (err.name && err.name === "TypeError") {
                                    MessageToast.show(err.message);
                                } else if (err.statusCode && err.statusCode === 401) {
                                    MessageBox.error("Please refresh the application", {
                                        title : err.responseText
                                    });
                                } else if(err.statusCode && err.statusCode === 404) {
                                    MessageToast.show("Server Down. Try again later!");
                                } else if (err.response.statusCode && err.response.statusCode === 502) {
                                    MessageToast.show("Server Down. Try again later!");
                                } else {
                                    MessageBox.error("Could not save the data!");
                                }
                                this.batchArray = [];
                                this._CloseBusyDialog();
                            }
                            break;
                        default :
                            // Submit the data and do BPA call
                            try {
                                let _submitResult = await API_Servants._SubmitBatchData(oDataModel),
                                    aBPAList = [];
                                
                                // Preparing for RT OT calculation
                                if(_submitResult.length !== 0) {
                                    for (let l = 0; l < payLoad.length; l++) {
                                        const element = payLoad[l];
                                        if(payLoad[l].EmployeeID !== "") {
                                            let oParams = { EmployeeID: element.EmployeeID,
                                                            PayPeriodBeginDate: element.PayPeriodBeginDate,
                                                            PayPeriodEndDate: element.PayPeriodEndDate,
                                                            OtFrequency : element.OtFrequency,
                                                            Date : element.Date,
                                                            AppName: 'CP_CREW' };

                                            // Calculating RT OT
                                            let rt_ot_result = await API_Servants._calculate_RT_OT(this.oBModels, "/RTOTCalulation", oParams);
                                            console.log("RT OT Result : ", rt_ot_result)
                                        }
                                    }
                                }

                                for (let ores of _submitResult)
                                    aBPAList.push(this._prepare_BPA_List(ores.data));

                                // finding unique records based on the ManagerApprovalMail
                                let aUnique = [...new Set(aBPAList.map(item => item.ManagerApprovalEmail))],
                                    _url = this._getCompleteURL() + "/workflow/rest/v1/workflow-instances",
                                    aBPAresult = [];

                                for (let i = 0; i < aUnique.length; i++) {
                                    const oUnique = aUnique[i];
                                    let aGroupedData = aBPAList.filter(item => item.ManagerApprovalEmail === oUnique),
                                        BPApayLoadData,
                                        tims = 0;

                                    for (let j = 0; j < aGroupedData.length; j++) {
                                        let oGroupedData = aGroupedData[j];
                                        delete oGroupedData.ManagerApprovalEmail;
                                        if (oGroupedData.TotalHours !== "0" && oGroupedData.TotalHours !== "" && this._validate_Dot_Format(oGroupedData.TotalHours)) { // 00:00 Format check
                                            tims = tims + this._get_Seconds_from_Time(oGroupedData.TotalHours, ".");
                                        }
                                    }
                                    BPApayLoadData = this._prepare_BPA_PayLoad(aGroupedData, oUnique, this._get_Hours_From_Seconds(tims));

                                    // BPA call for sending the data for approval
                                    let bpaRes = await API_Servants._TriggerBPA_Post(_url, JSON.stringify(BPApayLoadData));
                                    console.log(JSON.stringify(bpaRes));
                                    aBPAresult.push(bpaRes);
                                }

                                MessageBox.success("Timesheet successfully submitted for approval!");
                                this.batchArray = [];
                                this.oCount.empCount = 0;
                                this.oCount.equipCount = 0;
                                this.aHours_Tracker = [];
                                this.aTotal_Tracker = [];
                                this.aPaytotal_tracker = [];
                                // this.aHalfOrOne_Tracker = [];
                                this.aOne_Tracker = [];
                                let _submitted = await this._get_TimesheetDetails(oDate);
                                await this._determine_editable(_submitted.results);
                                this._prepare_ModelData(_submitted.results);
                            }
                            catch (err) {
                                console.log(err);
                                if (err.name && err.name === "TypeError") {
                                    MessageToast.show(err.message, { closeOnBrowserNavigation: false, duration: 10000, width: "50em" });
                                } else if (err.statusCode && err.statusCode === 401) {
                                    MessageBox.error("Please refresh the application", {
                                        title : err.responseText
                                    });
                                } else if(err.statusCode && err.statusCode === 404) {
                                    MessageToast.show("Server Down. Try again later!");
                                } else if (err.response.statusCode && err.response.statusCode === 502) {
                                    MessageToast.show("Server Down. Try again later!");
                                } else if (err.statusText && err.statusText === "error") {
                                    MessageToast.show(err.responseText, { closeOnBrowserNavigation: false, duration: 10000, width: "50em" });
                                    MessageBox.error("Could not submit data for approval. Please save the entries and try again later!");
                                } else {
                                    MessageBox.error("Could not submit data for approval. Please Save and try again later!");
                                }
                                this.batchArray = [];
                                this._CloseBusyDialog();
                            }
                    }
                } else {
                    MessageBox.error("No resource is booked against any cost object!", {
                        title: "No entry(s) found",
                    });
                }
            },

            on_SaveModified : async function(oEvent) {
                await this._check_Hours_Column();

                var payLoad = this._get_convertedPayload(),
                    osaveModel = this.getOwnerComponent().getModel(),
                    oDataModel = new sap.ui.model.odata.ODataModel(osaveModel.sServiceUrl),
                    oDate = this.getView().getModel("header").getData().date;

                let batch = [],
                    bflag = false;
                for (let i = 0; i < payLoad.length; i++) {
                    let element = payLoad[i];
                    if(element.SaveSubmitStatus === "Rejected" || element.SaveSubmitStatus === "Saved" ) {
                        element.SaveSubmitStatus = "Saved";
                        bflag = true;
                    }
                }

                if (bflag && (payLoad.length !== 0 || this.batchArray.length !== 0)) {
                    batch = this._prepare_batch(payLoad, oDataModel);
                    oDataModel.addBatchChangeOperations(batch);
                    console.log("Batch Array : ", batch);

                    try {
                        let _saveModified = API_Servants._SubmitBatchData(oDataModel);
                        console.log(_saveModified);
                        MessageToast.show("Modified Records Saved Successfully!");
                        this.batchArray = [];
                        this.oCount.empCount = 0;
                        this.oCount.equipCount = 0;
                        this.aHours_Tracker = [];
                        this.aTotal_Tracker = [];
                        this.aPaytotal_tracker = [];
                        this.aOne_Tracker = [];
                        this._CloseBusyDialog();
                        let _saved = await this._get_TimesheetDetails(oDate);
                        
                        // Determines Editable or non-editable
                        await this._determine_editable(_saved.results);

                        await this._prepare_ModelData(_saved.results);
                        this._enable_disable_save_resubmit();
                    } catch(err) {
                        console.log(err);
                        if (err.name && err.name === "TypeError") {
                            MessageToast.show(err.message);
                        } else if (err.statusCode && err.statusCode === 401) {
                            MessageBox.error("Please refresh the application", {
                                title : err.responseText
                            });
                        } else if(err.statusCode && err.statusCode === 404) {
                            MessageToast.show("Server Down. Try again later!");
                        } else if (err.response.statusCode && err.response.statusCode === 502) {
                            MessageToast.show("Server Down. Try again later!");
                        } else {
                            MessageBox.error("Could not save the data!");
                        }
                        this.batchArray = [];
                        this._CloseBusyDialog();
                    }
                } else {
                    MessageToast.show("All record(s) are in 'Awaiting Approval' or 'Not modified'");
                }
            },

            on_SubmitModified : function(oEvent) {
                console.log("Clicked on Submit modified button");
            },

            _enable_disable_save_resubmit : function() {
                this.getView().byId("button_2_1").setEnabled(false);
                this.getView().byId("button_accept_1").setEnabled(true);
            },








            /***************************************************************************
            * Internal Methods
            ***************************************************************************/
            // Busy indicator
            _BusyIndicator: function (_loader_text) {
                if (!this._pBusyDialog) {
                    this._pBusyDialog = Fragment.load({
                        name: "com.mgc.consprodui.consproduiprd.view.Fragments.BusyDialog",
                        controller: this
                    }).then(function (oBusyDialog) {
                        oBusyDialog.setText(_loader_text);
                        this.getView().addDependent(oBusyDialog);
                        syncStyleClass("sapUiSizeCompact", this.getView(), oBusyDialog);
                        return oBusyDialog;
                    }.bind(this));
                }

                this._pBusyDialog.then(function (oBusyDialog) {
                    oBusyDialog.open();
                }.bind(this));
            },

            // Close BusyDialog
            _CloseBusyDialog: function () {
                this._pBusyDialog.then(function (oBusyDialog) {
                    oBusyDialog.close();
                });
            },

            // returns Text Controller
            _generate_Text: function (_text) {
                return new Text({
                    text: _text
                });
            },

            // Returns the Object Status controller
            _generate_Object_Status: function (_text) {
                return new ObjectStatus({
                    text: _text,
                    icon: "sap-icon://message-warning",
                    state: "Warning",
                    inverted: true
                });
            },

            // returns Combo Box with Specified Parameters
            _generate_ComboBox: function (_sel_value, _value, _drop_items) {
                var aDrop_Items = [];
                for (let i = 0; i < _drop_items.length; i++) {
                    aDrop_Items.push(new Item(
                        {
                            key: _drop_items[i].key,
                            text: _drop_items[i].value
                        }));
                }

                return new ComboBox({
                    value: _value,
                    selectedKey: _sel_value,
                    items: aDrop_Items
                });
            },

            // returns icon controller
            _get_Icon_controller: function () {
                return new Icon({
                    src: "sap-icon://hint",
                    useIconTooltip: true,
                    color: sap.ui.core.IconColor.Neutral
                });
            },

            // returns Input Controller with specified paramters
            _generate_Input: function (_value, _placeHolder, _valueHelp, _editable, width, _valuHelpFunc, _visible = true) {
                let properties = {
                    value: _value,
                    placeholder: _placeHolder,
                    showValueHelp: _valueHelp,
                    editable: _editable,
                    visible: _visible
                };

                if (width !== "") {
                    properties = {
                        ...properties,
                        width: width
                    };
                }

                // Event Handler determination for ValueHelpRequest
                if (_valuHelpFunc !== "") {
                    switch (_valuHelpFunc) {
                        case "res":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_ResourceHelp.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "paycode":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_PayCodeHelp.bind(this),
                                change: this.on_PayCodeChange.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "job":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_JobHelp.bind(this),
                                change: this.on_JobChange.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "section":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_SectionHelp.bind(this),
                                change: this.on_SectionChange.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "phase":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_PhaseHelp.bind(this),
                                change: this.on_PhaseChange.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "qty":
                            properties = {
                                ...properties,
                                change: this.on_QtyChange.bind(this),
                            }
                            break;
                        case "uom":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_uomHelp.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "workorder":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_workOrderHelp.bind(this),
                                change: this.on_workorderChange.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "costcenter":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_costCenterHelp.bind(this),
                                change: this.on_costcenterChange.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "activity":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_activityHelp.bind(this),
                                change: this.on_activityChange.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                        case "equip":
                            properties = {
                                ...properties,
                                valueHelpRequest: this.on_equipHelp.bind(this),
                                change: this.on_equipmentChange.bind(this),
                                valueHelpOnly: true
                            }
                            break;
                    }
                }
                return new sap.m.Input(properties);
            },

            // Returns the Text Area controller with the suitable properties
            _generate_Text_Area: function (_value, _placeHolder, _editable, _width, _textAlign, _maxLenght) {
                let properties = {
                    value: _value,
                    placeholder: _placeHolder,
                    editable: _editable,
                    visible: true,
                    height: "7em",
                    textAlign: _textAlign,
                    maxLength : _maxLenght,
                    showExceededText : true,
                    liveChange : this.on_live_TextArea.bind(this)
                };

                if (_width !== "") {
                    properties = {
                        ...properties,
                        width: _width
                    };
                }

                return new TextArea(properties);
            },

            // Returns the Input box for Hours with suitable properties
            _generate_Hours_Input: function (_value, _placeHolder, _valueHelp, _editable, width, _valuHelpFunc) {
                let properties = {
                    value: _value,
                    placeholder: _placeHolder,
                    showValueHelp: _valueHelp,
                    editable: _editable,
                    showValueStateMessage : false
                };

                if (width !== "") {
                    properties = {
                        ...properties,
                        width: width
                    };
                }

                // Event Handler determination for ValueHelpRequest
                if (_valuHelpFunc !== "") {
                    properties = {
                        ...properties,
                        change: this.on_HoursChange.bind(this),
                        valueHelpOnly: true,
                        liveChange: this.on_HoursLiveChange.bind(this)
                    }
                }
                return new sap.m.Input(properties);
            },

            // returns a button with press Event
            _generate_btn: function (_text, _icon) {
                return new sap.m.Button({
                    text: _text,
                    icon: _icon,
                    press: this.on_Delete_Btn_Press.bind(this)
                });
            },

            // returns Column without Header Text
            _generate_Col: function (_hAlign = sap.ui.core.TextAlign.Right) {
                return new Column({
                    minScreenWidth: "Tablet",
                    width: "12em",
                    demandPopin: true,
                    hAlign: _hAlign
                })
            },

            // returns Column with Header Text
            _generate_Col_Header: function (_header_name) {
                return new Column({
                    minScreenWidth: "Tablet",
                    width: "12em",
                    demandPopin: true,
                    header: new sap.m.Text({
                        text: _header_name
                    })
                })
            },

            // returns structure of the Resource Table
            _get_ResTemplate: function () {
                return {
                    "EID": "",
                    "col_1": "",
                    "col_2": "00:00",
                    "FirstName": "",
                    "LastName": "",
                    "FullName": "",
                    "PersonnelSubArea": "",
                    "PersonnelSubAreaDescription": "",
                    "LocationCode": "",
                    "LocationCodeDescription": "",
                    "CompanyID": "",
                    "CompanyName": "",
                    "OtThreshold": "",
                    "OtFrequency" : "",
                    "Email": "",
                    "JobTitle": "",
                    "Province": "",
                    "ProvinceDescription": "",
                    "Phone": "",
                    "Description": "",
                    "PermissionLevel": ""
                }
            },

            // returns structure of the Hours Table
            _get_HoursTemplate: function () {
                return {
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
                    "id_1": "",
                    "id_2": "",
                    "id_3": "",
                    "id_4": "",
                    "id_5": "",
                    "id_6": "",
                    "id_7": "",
                    "id_8": "",
                    "id_9": "",
                    "id_10": "",
                    "status_1": "",
                    "status_2": "",
                    "status_3": "",
                    "status_4": "",
                    "status_5": "",
                    "status_6": "",
                    "status_7": "",
                    "status_8": "",
                    "status_9": "",
                    "status_10": "",
                };
            },

            // returns cost Element HEader template
            _get_CostTemplate: function () {
                return crew_models._get_table_11Model();
            },

            // returns the final payload object
            _get_final_template: function () {

                let _date = this.getView().getModel('header').getData().date;

                return {
                    "AppName": "CP_CREW",
                    "ID": "",
                    "EquipmentID": "",
                    "EquipmentDescription": "",
                    "EmployeeID": "",
                    "EmployeeName": "",
                    "LocationCode": "",
                    "Date": moment(_date, "YYYY-MM-DD").format("YYYY-MM-DD"),
                    "PayCode": "",
                    "PayPeriodDescription" : "",
                    "Job": "",
                    "JobDescription": "",
                    "ProfitCenter": "",
                    "Section": "",
                    "SectionDescription": "",
                    "Phase": "",
                    "PhaseDescription": "",
                    "Qty": "",
                    "UOM": "",
                    "WorkOrder": "",
                    "WorkorderDescription": "",
                    "CostCenter": "",
                    "Activity": "",
                    "SendingUnitTrailer": "",
                    "ReceivingUnitTruck": "",
                    "Comments": "",
                    "TotalHours": "00:00",
                    "SaveSubmitStatus": "",
                    "PayPeriodBeginDate": "",
                    "PayPeriodEndDate": "",
                    "PersonnelSubArea": "",
                    "PositionManagerName": "",
                    "PositionManagerEmail": "",
                    "ProjectManagerName": "",
                    "ProjectManagerEmail": "",
                    "ManagerApprovalName": "",
                    "ManagerApprovalEmail": "",
                    "CompanyID": "",
                    "CompanyName": "",
                    "OtThreshold": "",
                    "SequenceNo": "",
                    "ForemanID": "",
                    "DELETED": false
                }
            },

            // returns final cost element template
            _get_final_CostTemplate : function() {
                return {
                    "PayCode": "",
                    "Job": "",
                    "JobDescription": "",
                    "ProfitCenter": "",
                    "Section": "",
                    "SectionDescription": "",
                    "Phase": "",
                    "PhaseDescription": "",
                    "Qty": "",
                    "UOM": "",
                    "WorkOrder": "",
                    "WorkorderDescription": "",
                    "CostCenter": "",
                    "Activity": "",
                    "ReceivingUnitTruck": "",
                }
            },

            // returns employee count in the resource table
            _get_EmpCount: function () {
                return this.oCount.empCount;
            },

            // returns equipment count in the resource table
            _get_EquipCount: function () {
                return this.oCount.equipCount;
            },

            // adds employee count with the number passed in the parameter and return the value
            _add_employeeCount: function (x) {
                return this.oCount.empCount += x;
            },

            // adds equipment count with the number passed in the parameter and return the value
            _add_equipCount: function (x) {
                return this.oCount.equipCount += x;
            },

            // Minus employee count with the number passed in the parameter and return the value
            _minus_empCount: function (x) {
                return this.oCount.empCount -= x;
            },

            // Minus equipment count with the number passed in the parameter and return the value
            _minus_equipCount: function (x) {
                return this.oCount.equipCount -= x;
            },

            // Returns the excel template
            _get_excelSettings: function (_excel_data) {
                var aXcolumns = [];
                aXcolumns.push({
                    label: "Employee/Equipment Name",
                    property: "EmployeeName"
                });
                aXcolumns.push({
                    label: "EquipmentID",
                    property: "EquipmentID"
                });
                aXcolumns.push({
                    label: "Equipment Description",
                    property: "EquipmentDescription"
                });
                aXcolumns.push({
                    label: "Date",
                    property: "Date"
                });
                aXcolumns.push({
                    label: "PayCode",
                    property: "PayCode"
                });
                aXcolumns.push({
                    label: "Job",
                    property: "Job"
                });
                aXcolumns.push({
                    label: "JobDescription",
                    property: "JobDescription"
                });
                aXcolumns.push({
                    label: "Section",
                    property: "Section"
                });
                aXcolumns.push({
                    label: "SectionDescription",
                    property: "SectionDescription"
                });
                aXcolumns.push({
                    label: "Phase",
                    property: "Phase"
                });
                aXcolumns.push({
                    label: "PhaseDescription",
                    property: "PhaseDescription"
                });
                aXcolumns.push({
                    label: "Qty",
                    property: "Qty"
                });
                aXcolumns.push({
                    label: "UOM",
                    property: "UOM"
                });
                aXcolumns.push({
                    label: "WorkOrder",
                    property: "WorkOrder"
                });
                aXcolumns.push({
                    label: "WorkorderDescription",
                    property: "WorkorderDescription"
                });
                aXcolumns.push({
                    label: "CostCenter",
                    property: "CostCenter"
                });
                aXcolumns.push({
                    label: "Activity",
                    property: "Activity"
                });
                aXcolumns.push({
                    label: "SendingUnitTrailer",
                    property: "SendingUnitTrailer"
                });
                aXcolumns.push({
                    label: "ReceivingUnitTruck",
                    property: "ReceivingUnitTruck"
                });
                aXcolumns.push({
                    label: "SaveSubmitStatus",
                    property: "SaveSubmitStatus"
                });

                aXcolumns.push({
                    label: "TotalHours",
                    property: "TotalHours"
                });

                var _mSettings = {
                    workbook: {
                        columns: aXcolumns
                    },
                    dataSource: _excel_data,
                    fileName: "construction_crew.xlsx"
                }

                return _mSettings;
            },

            // Returns the corresponding Hours data from the array sent
            _get_corressponding_Hours: function (_seq, _hoursArr, index) {
                if (_hoursArr.some(oHour => Number(oHour.SequenceNo.split(',')[1]) === _seq)) {
                    if (_hoursArr[index].PayCode === "1070" || _hoursArr[index].PayCode === "1225"
                        || _hoursArr[index].PayCode === "1230" || _hoursArr[index].PayCode === "BOA" || _hoursArr[index].PayCode === "BN" || _hoursArr[index].PayCode === "BT") {
                        return _hoursArr.find(oHour => Number(oHour.SequenceNo.split(',')[1]) === _seq).TotalHours;
                    }
                    return _hoursArr.find(oHour => Number(oHour.SequenceNo.split(',')[1]) === _seq).TotalHours.replace(".", ":");
                }
                if (_hoursArr[index].PayCode === "1070" || _hoursArr[index].PayCode === "1225"
                    || _hoursArr[index].PayCode === "1230" || _hoursArr[index].PayCode === "BOA" || _hoursArr[index].PayCode === "BN" || _hoursArr[index].PayCode === "BT") {
                    return '0';
                }
                return "00:00";
            },

            // Returns the correspoding ID data from the array sent
            _get_corressponding_ID : function(_seq, _hoursArr) {
                if (_hoursArr.some(oHour => Number(oHour.SequenceNo.split(',')[1]) === _seq)) {
                    return _hoursArr.find(oHour => Number(oHour.SequenceNo.split(',')[1]) === _seq).ID;
                }
                return "";
            },

            // Returns the corresponding Status data from the array sent
            _get_corressponding_Status: function (_seq, _hoursArr) {
                if (_hoursArr.some(oHour => Number(oHour.SequenceNo.split(',')[1]) === _seq)) {
                    return _hoursArr.find(oHour => Number(oHour.SequenceNo.split(',')[1]) === _seq).SaveSubmitStatus;
                }
                return "";
            },

            // Check if any hours column not filled
            _check_Hours_Column: function () {
                this._BusyIndicator("Checking data...");
                let aCOTableData = this.getView().getModel("table_11").getData(),
                    aHoursTableData = this.getView().getModel("table_2").getData(),
                    iNoOfCols = this.getView().byId("_IDGenTable3").getColumns().length,
                    bFilledCOflag = false,
                    bFilledHoursflag = false;

                for (let i = 0; i < this.getView().byId("_IDGenTable3").getColumns().length; i++) { // iterating column wise
                    if (this.getView().byId("_IDGenTable3").getColumns().length !== 1) {
                        bFilledCOflag = false;
                        bFilledHoursflag = false;

                        // iterating the Cost object table 
                        for (let j = 0; j < aCOTableData.length; j++) {
                            let oCost = aCOTableData[j];
                            if (oCost[`col_${i + 1}`] !== "") {
                                bFilledCOflag = true;
                                break;
                            }
                        }

                        // if any one cost column is not given
                        if (bFilledCOflag === false) {
                            this.getView().byId('_IDGenTable2').getItems()[0].getCells()[i].firePress();
                            i = i - 1;
                            continue;
                        }

                        // iterating Hours - Row wise
                        for (let j = 0; j < aHoursTableData.length; j++) {
                            let oHour = aHoursTableData[j];
                            if (oHour[`col_${i + 1}`] !== '00:00' && oHour[`col_${i + 1}`] !== '0') {
                                bFilledHoursflag = true;
                                break;
                            }
                        }

                        // if any one hours column is not having atleast one hour filled
                        if (bFilledHoursflag === false) {
                            this.getView().byId('_IDGenTable2').getItems()[0].getCells()[i].firePress();
                            i = i - 1;
                            continue;
                        }
                    }
                }
                this._CloseBusyDialog();
            },

            // this updates the hours tracker and the ui states of the hours input box
            _update_hours_tracker: function (_col, _flag = true) {
                
                if (_flag) {
                    if (_col === 0) {
                        this.aHours_Tracker.splice(this.aHours_Tracker.indexOf(_col + 1), 1);
                        this.aOne_Tracker.splice(this.aOne_Tracker.indexOf(_col + 1), 1);
                        // this.aHalfOrOne_Tracker.splice(this.aHalfOrOne_Tracker.indexOf(_col+1), 1);
                    }

                    // Adjusting the column number in Hours_tracker
                    for (let i = 0; i <= this.aHours_Tracker.length; i++) {
                        if (_col + 1 <= this.aHours_Tracker[i]) {
                            this.aHours_Tracker[i] = this.aHours_Tracker[i] - 1;
                        }
                    }
                    // Removing duplicates
                    this.aHours_Tracker = [...new Set(this.aHours_Tracker)]

                    // Adjusting the column number in aOne_tracker
                    for (let i = 0; i <= this.aOne_Tracker.length; i++) {
                        if (_col + 1 <= this.aOne_Tracker[i]) {
                            this.aOne_Tracker[i] = this.aOne_Tracker[i] - 1;
                        }
                    }
                    // Removing duplicates
                    this.aOne_Tracker = [...new Set(this.aOne_Tracker)]

                    // // Adjusting the column number in HalforOne_Tracker
                    // for (let i = 0; i <= this.aHalfOrOne_Tracker.length; i++) {
                    //     if(_col+1 <= this.aHalfOrOne_Tracker[i]) {
                    //         this.aHalfOrOne_Tracker[i] = this.aHalfOrOne_Tracker[i] - 1; 
                    //     }
                    // }
                    // // Removing duplicates
                    // this.aHalfOrOne_Tracker = [...new Set(this.aHalfOrOne_Tracker)]
                }
            },

            // Returns the payload data
            _get_convertedPayload: function (_status = "") {
                let aResEmp = this.getView().getModel("resource").getData(),
                    aCostElement = this.getView().getModel("table_11").getData(),
                    aEmpHours = this.getView().getModel("table_2").getData(),
                    aTotHours = this.getView().getModel('tt_hours').getData(),
                    oHourTable = this.byId("_IDGenTable3"),
                    bNumberflag = false;

                // Final Json Data
                this.finalEmp_PayLoad = [];

                // Taking total no of columns that the user has created
                let iTotalCols = this.getView().byId("_IDGenTable2").getColumns().length;

                // structure
                let _finaltemp_struct = {},
                    _iSeq = 1;

                // Cost Element - Column Structure
                let c_element_keys = Object.keys(aCostElement[0]);

                // iterating the Employee Table
                for (let i = 0; i < aResEmp.length; i++) {   // TODO: To add the sequence at resource Level
                    const oResEmp = aResEmp[i];
                    // find if there is any amount related values found 0, 0.5 or 1
                    // bNumberflag = false;
                    // // iterating single row's columns
                    // for (let j = 0; j < oHourTable.getColumns().length ; j++) {
                    //     let oHour = aEmpHours[i]
                    //     if(!isNaN(oHour[`col_${j+1}`]) && oHour[`col_${j+1}`] !== "0" ) {
                    //         bNumberflag = true;
                    //         break;
                    //     }
                    // }
                    // if(oResEmp.col_2 !== "00:00" || bNumberflag === true) {
                        if (this.getView().byId("_IDGenTable4").getItems()[i].getCells()[1].getState() === "Success") {
                        // iterating to the no.of cols that user has created
                        for (let k = 0; k < iTotalCols; k++) {

                            _finaltemp_struct = this._get_final_template();
                            if ((aEmpHours[i][c_element_keys[k]] === "00:00" || aEmpHours[i][c_element_keys[k]] === "0:00" || aEmpHours[i][c_element_keys[k]] === "0" || aEmpHours[i][c_element_keys[k]] === "")) {
                                if (aEmpHours[i][c_element_keys[k].replace('col_', 'id_')] !== "")
                                    _finaltemp_struct.DELETED = true;
                                else {
                                    // if(!this.aSkips.includes(k+1))
                                    _iSeq = _iSeq + 1;
                                    continue;
                                }
                            }

                            // Determine the type of Resource (Employee or Equipment) based on the Counts
                            if (i < this._get_EmpCount()) {
                                _finaltemp_struct.EmployeeID = oResEmp.EID;
                                _finaltemp_struct.EmployeeName = oResEmp.FullName;
                                _finaltemp_struct.PersonnelSubArea = oResEmp.PersonnelSubArea;
                                _finaltemp_struct.LocationCode = oResEmp.LocationCode;
                                _finaltemp_struct.CompanyID = oResEmp.CompanyID;
                                _finaltemp_struct.CompanyName = oResEmp.CompanyName;
                                _finaltemp_struct.OtThreshold = oResEmp.OtThreshold;
                                _finaltemp_struct.OtFrequency = oResEmp.OtFrequency;
                            } else {
                                _finaltemp_struct.SendingUnitTrailer = oResEmp.EID
                                _finaltemp_struct.EquipmentID = oResEmp.EID;
                            }

                            // Copying Hours and ID from the model data to the final structure
                            // if(this.aHalfOrOne_Tracker.includes(k+1)) {
                            //     _finaltemp_struct.TotalHours = aEmpHours[i][c_element_keys[k]];
                            // } else {
                            //     _finaltemp_struct.TotalHours = aEmpHours[i][c_element_keys[k]].replace(":", ".");
                            // }
                            _finaltemp_struct.TotalHours = aEmpHours[i][c_element_keys[k]].replace(":", ".");

                            // Start of - get the ID and Status if there is any for the corresponding Hours
                            let id = "",
                                status = "";
                            switch (c_element_keys[k]) {
                                case 'col_1':
                                    id = aEmpHours[i]['id_1'];
                                    status = aEmpHours[i]['status_1'];
                                    break;
                                case 'col_2':
                                    id = aEmpHours[i]['id_2'];
                                    status = aEmpHours[i]['status_2'];
                                    break;
                                case 'col_3':
                                    id = aEmpHours[i]['id_3'];
                                    status = aEmpHours[i]['status_3'];
                                    break;
                                case 'col_4':
                                    id = aEmpHours[i]['id_4'];
                                    status = aEmpHours[i]['status_4'];
                                    break;
                                case 'col_5':
                                    id = aEmpHours[i]['id_5'];
                                    status = aEmpHours[i]['status_5'];
                                    break;
                                case 'col_6':
                                    id = aEmpHours[i]['id_6'];
                                    status = aEmpHours[i]['status_6'];
                                    break;
                                case 'col_7':
                                    id = aEmpHours[i]['id_7'];
                                    status = aEmpHours[i]['status_7'];
                                    break;
                                case 'col_8':
                                    id = aEmpHours[i]['id_8'];
                                    status = aEmpHours[i]['status_8'];
                                    break;
                                case 'col_9':
                                    id = aEmpHours[i]['id_9'];
                                    status = aEmpHours[i]['status_9'];
                                    break;
                                case 'col_10':
                                    id = aEmpHours[i]['id_10'];
                                    status = aEmpHours[i]['status_10'];
                                    break;
                            }
                            _finaltemp_struct.ID = id;
                            if (_status === "Awaiting Approval") {
                                if (status === "Awaiting Approval" || status === "Approved") {
                                    _finaltemp_struct.SaveSubmitStatus = status;
                                } else { // keeping it as empty just to mark it as a new record in multiple submition scenario
                                    _finaltemp_struct.SaveSubmitStatus = "Awaiting Approval";
                                }
                            }
                            else {
                                _finaltemp_struct.SaveSubmitStatus = status === "" ? _status : status;
                            }
                            // _finaltemp_struct.SaveSubmitStatus = _status;
                            // End of - get the ID and Status if there is any for the corresponding Hours

                            // iterating the Cost Element Table
                            for (let j = 1; j < aCostElement.length + 1; j++) {
                                const oCostElement = aCostElement[j];

                                switch (j) {
                                    case 1: // take PayCode value
                                        let pc_id_col = c_element_keys[k].replace("col_", "pid_");
                                        _finaltemp_struct.PayCode = oCostElement[pc_id_col];
                                        _finaltemp_struct.PayPeriodDescription = this._get_PayCodeDescription(oCostElement[pc_id_col]);
                                        // _finaltemp_struct.PayCode = oCostElement[c_element_keys[k]];
                                        break;
                                    case 2: // take Job value
                                        let jid_col = c_element_keys[k].replace("col_", "jid_"),
                                            pc_id = c_element_keys[k].replace("col_", "pc_");
                                        _finaltemp_struct.Job = oCostElement[jid_col];
                                        _finaltemp_struct.JobDescription = oCostElement[c_element_keys[k]];
                                        _finaltemp_struct.ProfitCenter = oCostElement[pc_id];
                                        break;
                                    case 3: // take Section value
                                        let sid_col = c_element_keys[k].replace("col_", "sid_");
                                        _finaltemp_struct.Section = oCostElement[sid_col];
                                        _finaltemp_struct.SectionDescription = oCostElement[c_element_keys[k]];
                                        break;
                                    case 4: // take Phase value
                                        let pid_col = c_element_keys[k].replace("col_", "pid_");
                                        _finaltemp_struct.Phase = oCostElement[pid_col];
                                        _finaltemp_struct.PhaseDescription = oCostElement[c_element_keys[k]];
                                        break;
                                    case 5: // take Qty
                                        _finaltemp_struct.Qty = oCostElement[c_element_keys[k]];
                                        break;
                                    case 6: // take UOM
                                        _finaltemp_struct.UOM = oCostElement[c_element_keys[k]];
                                        break;
                                    case 7: // take work order value
                                        let wid_col = c_element_keys[k].replace("col_", "wid_");
                                        _finaltemp_struct.WorkOrder = oCostElement[wid_col];
                                        _finaltemp_struct.WorkorderDescription = oCostElement[c_element_keys[k]];
                                        break;
                                    case 8: // take cost center value
                                        let cid_col = c_element_keys[k].replace("col_", "cid_");
                                        _finaltemp_struct.CostCenter = oCostElement[cid_col];
                                        // _finaltemp_struct.CostCenter = oCostElement[c_element_keys[k]];
                                        break;
                                    case 9: // take activity value
                                        _finaltemp_struct.Activity = oCostElement[c_element_keys[k]];
                                        break;
                                    case 10: // take Equipment value
                                        let eid_col = c_element_keys[k].replace("col_", "eid_");
                                        _finaltemp_struct.ReceivingUnitTruck = oCostElement[eid_col];
                                        break;
                                    case 11 : // take Comment value
                                        _finaltemp_struct.Comments = aTotHours[1][c_element_keys[k]];
                                        break;
                                }
                            }

                            _finaltemp_struct.SequenceNo = `${k + 1},${_iSeq}`;
                            _finaltemp_struct.PayPeriodBeginDate = moment(this.payPeriod.startDate).format("YYYY-MM-DD");
                            _finaltemp_struct.PayPeriodEndDate = moment(this.payPeriod.endDate).format("YYYY-MM-DD");
                            _finaltemp_struct.ForemanID = EmpID;
                            this.finalEmp_PayLoad.push(_finaltemp_struct);
                            _finaltemp_struct = {};
                            // if(!this.aSkips.includes(k+1)) 
                            _iSeq = _iSeq + 1;
                        }
                    }
                }

                return this.finalEmp_PayLoad;
            },

            // Returns the Batch array
            _prepare_batch: function (_data, _oDataModel) {
                // let batchArray = [];

                for (let i = 0; i < _data.length; i++) {
                    let oRecord = _data[i],
                        batchOperation;

                    if (oRecord.ID === '' || oRecord.ID === undefined) {
                        delete oRecord.ID;
                        batchOperation = _oDataModel.createBatchOperation("/TimeSheetDetails_prd", "POST", oRecord);
                    } else if (oRecord.ID && oRecord.ID !== "" && oRecord.DELETED === false) {
                        batchOperation = _oDataModel.createBatchOperation(`/TimeSheetDetails_prd(ID=${oRecord.ID},AppName='${oRecord.AppName}',Date='${oRecord.Date}')`, "PATCH", oRecord);
                    } else if (oRecord.ID && oRecord.ID !== "" && oRecord.DELETED === true) {
                        batchOperation = _oDataModel.createBatchOperation(`/TimeSheetDetails_prd(ID=${oRecord.ID},AppName='${oRecord.AppName}',Date='${oRecord.Date}')`, "PATCH", { DELETED : true, SequenceNo : "" });
                    }
                    this.batchArray.push(batchOperation);
                }

                return this.batchArray;
            },

            // disable Hours Table
            _disable_Hours: function (_flag, _col) {
                let oHoursTable = this.byId("_IDGenTable3"),
                    aHours = this.getView().getModel('table_2').getData();

                for (let i = 0; i < aHours.length; i++) {
                    oHoursTable.getItems()[i].getCells()[_col].setEditable(!_flag);
                }
            },

            // disable cost object except specified cost object - for Event
            _disable_except_specified_cost: function (oEvent, _col, _co1, _co2 = "", _co3 = "", _co4 = "", _co5 = "", _co6 = "", _co7 = "", _co8 = "", _co9 = "", _co10 = "") {
                for (let i = 1; i < 11; i++) {
                    if (i !== _co1 && i !== _co2 && i !== _co3 && i !== _co4 && i !== _co5 && i !== _co6 && i !== _co7 && i !== _co8 && i !== _co9 && i !== _co10)
                        oEvent.getSource().getParent().getParent().getItems()[i].getCells()[_col - 1].setEditable(false);
                }
            },

            // enable cost object except specified cost object - for Event
            _enable_except_specified_cost: function (oEvent, _col, _co1, _co2 = "", _co3 = "", _co4 = "", _co5 = "", _co6 = "", _co7 = "", _co8 = "", _co9 = "", _co10 = "") {
                for (let i = 1; i < 11; i++) {
                    if (i !== _co1 && i !== _co2 && i !== _co3 && i !== _co4 && i !== _co5 && i !== _co6 && i !== _co7 && i !== _co8 && i !== _co9 && i !== _co10)
                        oEvent.getSource().getParent().getParent().getItems()[i].getCells()[_col - 1].setEditable(true);
                }
            },

            // disable cost object except specified cost object - for Table
            _Tdisable_except_specified_cost: function (oTable, _col, _co1, _co2 = "", _co3 = "", _co4 = "", _co5 = "", _co6 = "", _co7 = "", _co8 = "", _co9 = "", _co10 = "") {
                for (let i = 1; i < oTable.getItems().length; i++) {
                    if (i !== _co1 && i !== _co2 && i !== _co3 && i !== _co4 && i !== _co5 && i !== _co6 && i !== _co7 && i !== _co8 && i !== _co9 && i !== _co10)
                        oTable.getItems()[i].getCells()[_col - 1].setEditable(false);
                }
            },

            // enable cost object except specified cost object - for Table
            _Tenable_except_specified_cost: function (oTable, _col, _co1, _co2 = "", _co3 = "", _co4 = "", _co5 = "", _co6 = "", _co7 = "", _co8 = "", _co9 = "", _co10 = "") {
                for (let i = 1; i < oTable.getItems().length; i++) {
                    if (i !== _co1 && i !== _co2 && i !== _co3 && i !== _co4 && i !== _co5 && i !== _co6 && i !== _co7 && i !== _co8 && i !== _co9 && i !== _co10)
                        oTable.getItems()[i].getCells()[_col - 1].setEditable(true);
                }
            },

            // Returns the Description of a Equipemnt
            _get_EquipmentDescription: function (_id) {
                let aEquips = this.SearchHelp_original.Equipments;
                if (aEquips.some(oEquip => oEquip.ID === _id)) {
                    return aEquips.find(oEquip => oEquip.ID === _id).LastName;
                }
                return "";
            },

            // Returns the Description of a PayCode
            _get_PayCodeDescription: function (_id) {
                let aPayCodes = this.SearchHelp_original.PayCodes;
                if (aPayCodes.some(oPayCode => oPayCode.PaycodeID === _id)) {
                    return aPayCodes.find(oPayCode => oPayCode.PaycodeID === _id).PaycodeName;
                }
                return "";
            },

            // Returns the Description of a Cost Center
            _get_CostCenterDescription: function (_id) {
                let aCostCenters = this.SearchHelp_original.CostCenters;
                if (aCostCenters.some(oCostCenter => oCostCenter.costcenterExternalObjectID === _id)) {
                    return aCostCenters.find(oCostCenter => oCostCenter.costcenterExternalObjectID === _id).name;
                }
                return "";
            },

            // Removes the value from the hours tracker
            _remove_from_HoursTracker: function (_item) {
                const index = this.aHours_Tracker.indexOf(_item);
                if (index > -1) {
                    this.aHours_Tracker.splice(index, 1);
                }
            },

            // Preserves the Resource's Total Hours States
            _preserve_ResourceTotalStates : function(_resData) {
                let _oResTable = this.byId("_IDGenTable4"),
                    oHourTable = this.byId("_IDGenTable3"),
                    aHoursData = this.getView().getModel("table_2").getData(),
                    bNumberflag = false;

                // Resource Hours Table
                for (let i = 0; i < _resData.length; i++) {
                    const element = _resData[i];
                    bNumberflag = false;
                    // iterating single row's columns
                    for (let j = 0; j < oHourTable.getColumns().length; j++) {
                        let oHour = aHoursData[i]
                        if (!isNaN(oHour[`col_${j + 1}`]) && oHour[`col_${j + 1}`] !== "0") {
                            bNumberflag = true;
                            break;
                        }
                    }

                    if (element.col_2 === "00:00" && bNumberflag === false) {
                        _oResTable.getItems()[i].getCells()[1].setIcon("sap-icon://message-warning");
                        _oResTable.getItems()[i].getCells()[1].setState(sap.ui.core.ValueState.Warning);
                    }
                    else {
                        _oResTable.getItems()[i].getCells()[1].setIcon("sap-icon://time-account");
                        _oResTable.getItems()[i].getCells()[1].setState(sap.ui.core.ValueState.Success);
                    }
                }
            },

            // Preserves the Resource's Total Hours States
            _preserve_TotalHoursStates: function (_totalData) {
                let _oTotalTable = this.byId("_IDGenTable5"),
                    aHoursData = this.getView().getModel("table_2").getData(),
                    bNumberflag = false;

                // Total Hours Table
                for (let i = 0; i < this.byId('_IDGenTable5').getColumns().length; i++) {
                    bNumberflag = false;
                    for (let j = 0; j < aHoursData.length; j++) {
                        const oHour = aHoursData[j];
                        if (!isNaN(oHour[`col_${i + 1}`]) && oHour[`col_${i + 1}`] !== "0") {
                            bNumberflag = true;
                            break;
                        }
                    }

                    if (_totalData[0][`col_${i + 1}`] === "00:00" && bNumberflag === false) {
                        _oTotalTable.getItems()[0].getCells()[i].setIcon("sap-icon://message-warning");
                        _oTotalTable.getItems()[0].getCells()[i].setState(sap.ui.core.ValueState.Warning);
                    }
                    else {
                        _oTotalTable.getItems()[0].getCells()[i].setIcon("sap-icon://time-account");
                        _oTotalTable.getItems()[0].getCells()[i].setState(sap.ui.core.ValueState.Success);
                    }
                }
            },

            // Preserves the UI states after getting the data from backend
            _preserveUIStates: function (_data) {
                let _oHeaderInput = this.byId("_IDGenTable2"),
                    _HoursTable = this.getView().byId('_IDGenTable3'),
                    _TotalTable = this.getView().byId("_IDGenTable5"),
                    _ResTable = this.getView().byId("_IDGenTable4"),
                    aHoursData = this.getView().getModel("table_2").getData(),
                    c_element_keys = Object.keys(_data[0]),
                    bflag = false;

                // preserving the Column's state
                if (this.no_of_Cols > _oHeaderInput.getColumns().length) {
                    let iNewCols = this.no_of_Cols - _oHeaderInput.getColumns().length;
                    for (let i = 0; i < iNewCols; i++) {
                        _oHeaderInput.addColumn(this._generate_Col());
                        _HoursTable.addColumn(this._generate_Col_Header('Hours'));
                        _TotalTable.addColumn(this._generate_Col(sap.ui.core.TextAlign.Begin));
                    }
                }
                else if (this.no_of_Cols < _oHeaderInput.getColumns().length) {
                    let iDelCols = _oHeaderInput.getColumns().length - this.no_of_Cols;
                    // if(this.no_of_Cols === )
                    for (let i = 0; i < iDelCols; i++) {
                        if (_oHeaderInput.getColumns().length !== 1) {
                            _oHeaderInput.removeColumn(_oHeaderInput.getColumns().length - 1);
                            _HoursTable.removeColumn(_HoursTable.getColumns().length - 1);
                            _TotalTable.removeColumn(_TotalTable.getColumns().length - 1);
                        }
                    }
                }

                if (this.bEditable) {
                    // iterating to the no.of cols that user has created
                    for (let k = 0; k < this.no_of_Cols; k++) {

                        // Preserving the Editable or non-Editable states of the Input boxes
                        for (let j = 2; j < _data.length; j++) {
                            const oCost = _data[j];
                            bflag = false;

                            switch (j) {
                                case 1:
                                    // Finding out if there is any filled cost objects for the event column
                                    for (let i = 2; i < _data.length; i++) {
                                        const element = _data[i];
                                        if (element[`col_${k + 1}`] !== "") {
                                            bflag = true;
                                            break;
                                        }
                                    }
                                    if (oCost[c_element_keys[k]] !== "") {
                                        this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6, 7, 8, 9);
                                    }
                                    else {
                                        if (bflag) {
                                            this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
                                        } else {
                                            this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6, 7, 8, 9);
                                        }
                                    }
                                case 2:
                                    if (oCost[c_element_keys[k]] !== "") {
                                        this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6);
                                    }
                                    break;
                                case 7:
                                    if (oCost[c_element_keys[k]] !== "") {
                                        this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 7, 1);
                                    }
                                    break;
                                case 8:
                                    if (oCost[c_element_keys[k]] !== "") {
                                        this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 8, 9, 1);
                                    }
                                    break;
                                case 10:
                                    if (oCost[c_element_keys[k]] !== "") {
                                        this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 10);
                                    }
                                    break;
                            }
                        }
                    }
                } else { // if the editable flag is false(means data are in submitted state)
                    // iterating to the no.of cols that user has created
                    for (let k = 0; k < this.no_of_Cols; k++) {

                        // Disabling all the Header Cost Object fields
                        for (let j = 0; j < _oHeaderInput.getItems().length; j++) {
                            if(j === 0) {
                                _oHeaderInput.getItems()[j].getCells()[k].setEnabled(false);
                            } else {
                                _oHeaderInput.getItems()[j].getCells()[k].setEditable(false);
                            }
                        }

                        // Disabling all the Hours Fields
                        for (let j = 0; j < _HoursTable.getItems().length; j++) {
                            _HoursTable.getItems()[j].getCells()[k].setEditable(false);
                            // ************ Start of needed ***************
                            // switch(aHoursData[j][`status_${k+1}`]) {
                            //     case "Awaiting Approval" :
                            //         _HoursTable.getItems()[j].getCells()[k].setValueState(sap.ui.core.ValueState.Warning);
                            //     break;
                            //     case "Approved" :
                            //         _HoursTable.getItems()[j].getCells()[k].setValueState(sap.ui.core.ValueState.Success);
                            //     break;
                            //     case "Rejected" :
                            //         _HoursTable.getItems()[j].getCells()[k].setValueState(sap.ui.core.ValueState.Error);
                            //     break;
                            //     case "Saved" :
                            //         _HoursTable.getItems()[j].getCells()[k].setValueState(sap.ui.core.ValueState.Information);
                            //     break;
                            //     default:
                            //         _HoursTable.getItems()[j].getCells()[k].setValueState(sap.ui.core.ValueState.None);
                            // }
                            // ************ End of needed ***************
                        }

                        // Disabling the Total Hours Table
                        _TotalTable.getItems()[1].getCells()[k].setEditable(false);
                    }

                    // iterating the resource table to make it non editable
                    for (let i = 0; i < _ResTable.getItems().length; i++) {
                        _ResTable.getItems()[i].getCells()[0].setEditable(false);
                    }
                }
            },

            // Determines the states of the Cost object Table columns
            _Determine_Validation: function (_data, _noOfColumns, _start_column) {
                let _oHeaderInput = this.byId("_IDGenTable2"),
                    c_element_keys = Object.keys(_data[0]),
                    aCostElement = this.getView().getModel("table_11").getData(),
                    oHoursTable = this.byId("_IDGenTable3"),
                    bflag = false,
                    bExecution = true;
                for (let k = _start_column; k < _noOfColumns; k++) {

                    // First step - Enable all the input boxes of the current k column
                    for (let j = 1; j < _oHeaderInput.getItems().length; j++) {
                        let oItems = _oHeaderInput.getItems()[j];
                        oItems.getCells()[k].setEditable(true);
                    }

                    bExecution = true;
                    // Preserving the Editable or non-Editable states of the Input boxes
                    for (let j = 1; j < _data.length; j++) {
                        const oCost = _data[j];
                        bflag = false;
                        switch (j) {
                            case 1:
                                // Finding out if there is any filled cost objects for the event column
                                for (let i = 2; i < aCostElement.length; i++) {
                                    const element = aCostElement[i];
                                    if (element[`col_${k + 1}`] !== "") {
                                        bflag = true;
                                        break;
                                    }
                                }
                                if (oCost[c_element_keys[k]] !== "") {
                                    this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6, 7, 8, 9);
                                }
                                else {
                                    if (bflag) {
                                        this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

                                    } else {
                                        this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6, 7, 8, 9);
                                    }
                                }

                                break;
                            case 2:
                                bflag = aCostElement[1][`col_${k + 1}`] !== "" ? true : false;
                                if (oCost[c_element_keys[k]] !== "") {
                                    this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6);
                                    bExecution = false;
                                }
                                else {
                                    if (bflag)
                                        this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6, 10);
                                    else
                                        this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 1, 2, 3, 4, 5, 6);
                                }

                                break;
                            case 7:
                                bflag = aCostElement[1][`col_${k + 1}`] !== "" ? true : false;
                                if (oCost[c_element_keys[k]] !== "") {
                                    this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 7, 1);
                                    bExecution = false;
                                } else {
                                    if (bflag)
                                        this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 7, 1, 10);
                                    else
                                        this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 7, 1);
                                }
                                break;
                            case 8:
                                bflag = aCostElement[1][`col_${k + 1}`] !== "" ? true : false;
                                if (oCost[c_element_keys[k]] !== "") {
                                    this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 8, 9, 1);
                                    bExecution = false;
                                } else {
                                    if (bflag)
                                        this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 8, 9, 1, 10);
                                    else
                                        this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 8, 9, 1);
                                }
                                break;
                            case 10:
                                if (oCost[c_element_keys[k]] !== "") {
                                    this._Tdisable_except_specified_cost(_oHeaderInput, k + 1, 10);
                                    bExecution = false;
                                } else
                                    this._Tenable_except_specified_cost(_oHeaderInput, k + 1, 10);
                                break;
                        }

                        if (!bExecution) break;
                    }

                    for (let j = 0; j < oHoursTable.getItems().length; j++) {
                        if (this.aHours_Tracker.includes(k + 1)) {
                            oHoursTable.getItems()[j].getCells()[k].setEditable(true);
                        } else {
                            oHoursTable.getItems()[j].getCells()[k].setEditable(false);
                        }
                    }
                }
            },

            // Returns True if 00:00 format matches
            _validate_Colon_Format : function (_hr) {
                // let regex = /\d{1,2}:\d\d/i;
                let regex = /^([0-1]?[0-9]|2[0-4]):[0-5][0-9]$/gm;
                return regex.test(_hr);
            },

            // Returns True if 00.00 foramt matches
            _validate_Dot_Format: function (_hr) {
                // let regex = /\d{1,2}\.\d\d/i;
                let regex = /^([0-1]?[0-9]|2[0-4])\.[0-5][0-9]$/gm;
                return regex.test(_hr);
            },

            // Returns the time in seconds
            _get_Seconds_from_Time(_time, _char) {
                let tims = 0;

                tims = tims + (parseInt(_time.split(_char)[0]) * 3600)
                    + (parseInt(_time.split(_char)[1]) * 60);
                return tims;
            },

            // Returns Total Hours from the Seconds
            _get_Hours_From_Seconds: function (tims) {
                let toth = 0,
                    totm = 0,
                    toth_txt = "",
                    tot;
                if (tims > 0) {
                    toth = Math.floor((tims / 3600));
                    toth_txt = ":"

                    if (tims > (toth * 3600)) {
                        totm = Math.floor(((tims - (toth * 3600)) / 60));
                        if (Number(totm) < 10) {
                            // tot = toth + toth_txt + totm + " min";  
                            tot = `${toth}${toth_txt}0${totm}`;
                            // tot = toth + toth_txt + totm;
                        }
                        else {
                            // tot = toth + toth_txt + totm + " mins"; 
                            tot = `${toth}${toth_txt}${totm}`;
                        }
                    }
                    else {
                        tot = `${toth}:00`;
                    }
                } else {
                    tot = "00:00";
                }

                return tot;
            },

            // Hide re-submit options ----> Button after submittion
            _hide_resubmitOptions : function (_flag) {
                this.getView().byId("button_2_1").setVisible(!_flag);
                this.getView().byId("button_accept_1").setVisible(!_flag);
            },
            
            // Initial enablement of footer Buttons after submittion
            _initial_footer_resubmitOptions : function () {
                if(this.bSaveModified === true) {
                    this.getView().byId("button_2_1").setEnabled(false);
                    this.getView().byId("button_accept_1").setEnabled(true);
                }
                else {
                    this.getView().byId("button_2_1").setEnabled(true);
                    this.getView().byId("button_accept_1").setEnabled(false);
                } 
            },

            // Disable resubmit footer buttons ----> Button after submittion
            _disable_footer_resubmitOptions : function (_flag) {
                this.getView().byId("button_2_1").setEnabled(!_flag);
                this.getView().byId("button_accept_1").setEnabled(!_flag);
            },

            // Disable resubmit footer buttons ----> Button after submittion
            _alternate_disable_footer_resubmitOptions : function (_flag) {
                this.getView().byId("button_2_1").setEnabled(!_flag);
                this.getView().byId("button_accept_1").setEnabled(_flag);
            },

            // Hide Footer buttons ----> Button before submittion
            _hide_Footer_buttons : function (_flag) {
                this.getView().byId("button_2").setVisible(!_flag);
                this.getView().byId("button_accept").setVisible(!_flag);
            },

            // Disable Footer buttons ----> Button before submittion
            _disable_footer_buttons : function (_flag) {
                this.getView().byId("button_2").setEnabled(!_flag);
                this.getView().byId("button_accept").setEnabled(!_flag);
            },

            // Disable All Header actional buttons
            _disable_header_actional_button: function (_flag) {
                this.byId("add_1").setEnabled(!_flag);
                this.byId("add_2").setEnabled(!_flag);
                this.byId("add_3").setEnabled(!_flag);
                this.byId("delete_1").setEnabled(!_flag);
            },

            // Enable the legends 
            _enable_legends : function(_flag) {
                this.byId("awaiting_tag").setVisible(_flag);
                this.byId("approved_tag").setVisible(_flag);
                this.byId("rejected_tag").setVisible(_flag);
            },

            // Re-Determine the show/hide cost objects
            _redetermine_SH_CO: function () {
                let _oHeader = this.getView().byId('_IDGenTable2'),
                    _items = _oHeader.getItems();

                for (let i = 1; i < _items.length; i++) {
                    let element = _items[i],
                        visibility = this.aVisibility_Tracker.find(p => p === i) ? true : false;
                    element.setVisible(!visibility);
                }
            },

            // Returns a Record for the BPA PayLoad List Data
            _prepare_BPA_List: function (_oRec) {

                let _oNewRecord = {
                    "Resource": _oRec.EmployeeID,
                    "Activity": _oRec.Activity,
                    "Section": _oRec.Section,
                    "Job": _oRec.Job,
                    "Phase": _oRec.Phase,
                    "Work_order": _oRec.WorkOrder,
                    "Cost_center": _oRec.CostCenter,
                    "Qty": _oRec.Qty,
                    "UoM": _oRec.UOM,
                    "Pay_code": _oRec.PayCode,
                    "Section_Description": _oRec.SectionDescription,
                    "Job_Description": _oRec.JobDescription,
                    "Phase_Description": _oRec.PhaseDescription,
                    "WorkOrder_Description": _oRec.WorkorderDescription,
                    "ManagerApprovalEmail": _oRec.ManagerApprovalEmail,
                    "TotalHours": _oRec.TotalHours,
                    "EmployeeName": _oRec.EmployeeName,
                    "Comments": _oRec.Comments,
                    "AppID": _oRec.ID,
                    "ReceivingUnitTruck": _oRec.ReceivingUnitTruck,
                    "SendingUnitTrailer": _oRec.SendingUnitTrailer
                };
                return _oNewRecord;
            },

            // Return PayLoad that should be sent for BPA
            _prepare_BPA_PayLoad: function (_list, _toMail, _totalHours) {

                let Date = moment(this.getView().getModel("header").getData().date, "DD-MM-YYYY").format("YYYY-MM-DD"),
                    sForemanName = `${this.oForemanData.FirstName} ${this.oForemanData.LastName}`;
                return {
                    // "definitionId": "us10.mgetm-cwr4nkvu.constructioncrewtaskui.crew_Process",
                    "definitionId": "us10.mgetm-cwr4nkvu.constructioncrewnoneditableprd.crew_Process",
                    "context": {
                        "crew": {
                            "Crew_list": _list
                        },
                        "appname": "CP_CREW",
                        "date": Date,
                        "mailid": _toMail,
                        "approved": "Approved",
                        "rejected": "Rejected",
                        "initiatormailid": this.oForemanData.Email,
                        "ccmailid": "",
                        "parallelapprovermail": "",
                        "foremanname": sForemanName
                    }
                };
            },




            


            /***************************************************************************
            * URL Builders
            ***************************************************************************/
            // Returns the Application ID
            _getApplicationID: function () {
                return this.getOwnerComponent().getManifestEntry("/sap.app").id.replaceAll(".", "");
            },

            // Returns the Application Version
            _getApplicationVersion: function () {
                return this.getOwnerComponent().getManifestEntry("/sap.app").applicationVersion.version;
            },

            // Returns the Applucation Router
            _getApplicationRouter: function () {
                return "/" + this.getOwnerComponent().getManifestEntry("/sap.cloud").service;
            },

            // Returns the complete URL of the Application
            _getCompleteURL: function () {
                return this._getApplicationRouter() + "." + this._getApplicationID() + "-" + this._getApplicationVersion();
            },

            _getBaseURL: function () {
                return sap.ui.require.toUrl("com/mgc/consprodui/consproduiprd");
            },
        });
    });
