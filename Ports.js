

/*
Copyright (C) 2014 John Orford

This file is part of VARIFY.

VARIFY is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

VARIFY is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with VARIFY.  If not, see <http://www.gnu.org/licenses/>.
*/



//text output -- it no html or graphical output


//input and output port for file data
//lookup statmodel name in order to get function
//spawn a worker for each lookback / model combo
//collate into array of objects

////////////////////////////////////////////////////


/*
Show now drop downs before file input

~~

File input -> Generate dropdowns -> generate ports for 'get analytics' module


number of days of data from file        / 500 / horizon
                                        / 100 / horizon
                                        / 50 / horizon

are the max lookbacks for 0.01, 0.05 and 0.1 percentiles resp.

if max lookback is less than 3 then don't show that horizon for that percentile.

        --we may get away with less than 3 for weekly and monthly lookbacks
        --we can use daily returns and scale up

only compute results for max lookback for now (assume that max lookback is better than shorter lookbacks).








*/


////////////////////////////////////////////////////
     
var globalWorkers = [];
var globalResults = [];
var globalCurrentPrice;          
var pCount = 0;

var totalReturns;

var horizon;
var percentile;




                
////////////////////////////////////////////////////////////////////////////////

function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        files = evt.dataTransfer.files; // FileList object.

        file = files[0];
	reader = new FileReader();
	reader.onload = function (event) {
	        fileData = event.target.result;	
                wipe();
	        //file's text data is sent to 'openfromfile' port
	        fileupload.ports.openFromFile.send(fileData);
		}
	reader.readAsText(file);
        }

function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
        }

// Setup the dnd listeners.
var dropZone = document.getElementById('dropFile');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
   



////////////////////////////////////////////////////////////////////////////////


//click on link and load this file
function readFile() {
        file = d3.text("tes_data/vix.csv",fileupload.ports.openFromFile.send);
        } 
        
////////////////////////////////////////////////////////////////////////////////


//initial elm worker setup
fileupload = Elm.worker(
                        Elm.FileUpload, {openFromFile: ""}
	                );

// action after file data is available
fileupload.ports.processFile.subscribe(
	function(fileData) {
                globalCurrentPrice = fileData[0];
                
                h = document.getElementsByName('horizon')[0];
                p = document.getElementsByName('percentile')[0];
                
                totalReturns = fileData.length - 1;
                
                drawDropdowns(+h.value,+p.value);
                
                globalWorkers = [];
                
                init(fileData);
                
                globalWorkers.forEach(function(ga){
                        ga.ports.priceData.send(fileData);
                        });
		}
	);   



////////////////////////////////////////////////////////////////////////////////




function init(fileData){
        generateGlobalWorkers(fileData);
                
        //change horizon
        horizon.onchange = function (e) {
                        newH = +this.value;
                        //update all workers
                        p = document.getElementsByName('percentile')[0];
                        drawDropdowns(newH,+p.value);
                        
                        wipe();

                        globalWorkers = [];
                        generateGlobalWorkers(fileData);
                        
                        globalWorkers.forEach( function(ga){
                                ga.ports.horizon.send(newH);
                                });
                        };
                      
        //change percentile
        percentile.onchange = function (e) {
                        newP = +this.value;
                        h = document.getElementsByName('horizon')[0];
                        drawDropdowns(+h.value,newP);
                        
                        wipe();
                        
                        globalWorkers = [];
                        generateGlobalWorkers(fileData);
                        
                        globalWorkers.forEach( function(ga){
                                ga.ports.percentile.send(newP);
                                    
                                });
                        };
        }

function generateGlobalWorkers(priceData){
        horizon = document.getElementsByName('horizon')[0];
        percentile = document.getElementsByName('percentile')[0];

        //combos of lookbacks and statmodels
        lbXsm = getLookbacksAndStatModels();  

        lbXsm.forEach( function (xs) {
                //initial setup
                ga = Elm.worker(Elm.GetAnalytics, 
                                {statModel: xs[1], horizon: +horizon.value, percentile: +percentile.value, priceData: priceData, lookbackP: xs[0]}
                                );
                
                //action once results are available
                ga.ports.outputResult.subscribe(
                        function(output2) {
                                pCount = pCount + 1;
                                //ignore output which does not produce any breaches
                                globalResults.push(output2);
                                updatePage(output2);
                                updateHTML(globalResults);               
                                });
                                
                //the workers which will receive data after the file upload
                globalWorkers.push(ga);
                });
        }


////////////////////////////////////////////////////////////////////////////////

function drawDropdowns(currentH,currentP) {
        possibleHorizons = [1,5,21];
        possiblePercentiles = [0.01,0.05,0.1];
        
        minLookback = 3;
        
        dropDownParameters = [];
        
        //with current settings
        //grab possibilities
        //e.g. default is weekly-> grab percentiles under contraints
        //0.01                  -> grab horizons matching constraints
        
        console.log(totalReturns);
        
        
        possibleHorizons.forEach(function(h){
                if (currentP*totalReturns/(h*minLookback) >= 5) {
                        
                
                        dropDownParameters.push({horizon:h,percentile:currentP});
                        }
                });
        
        possiblePercentiles.forEach(function(p){
                if (p*totalReturns/(currentH*minLookback) >= 5) {
                        dropDownParameters.push({horizon:currentH,percentile:p});
                        }
                });
        
        d3      .select("#form")
                .style("display","");
        
        d3.selectAll("option").remove();
        
        //update horizon drop down
        
        horizonContainer = d3.select("#horizon");
        
        //join
        horizonSelects = horizonContainer
                .selectAll("option")
                //filter out var NaNs
                .data( _.uniq(_.pluck(dropDownParameters,"horizon") ).sort(function(a,b){return a.length<b.length}) );
        
        //enter
        horizonSelects  .enter()
                        .append("option")
                        .attr("value", function(d){return d;})
                        .text(function(d){
                                if      (d==1)  {return "Daily";}
                                else if (d==5)  {return "Weekly";}
                                else            {return "Monthly";}
                                });
        
        setSelected = d3.selectAll("option").filter(function (d,i){return d == currentH});
        setSelected.attr("selected","selected")
        
        //update percentile drop down
        
        percentileContainer = d3.select("#percentile");
        
        //join
        percentileSelects = percentileContainer
                .selectAll("option")
                //filter out var NaNs
                .data( _.uniq(_.pluck(dropDownParameters,"percentile") ).sort() );
        
        //enter
        percentileSelects       .enter()
                                .append("option")
                                .attr("value", function(d){return d;})
                                .text(function(d){
                                        return 100*(1-d);
                                        });
        
        setSelected = d3.selectAll("option").filter(function (d,i){return d == currentP});
        setSelected.attr("selected","selected");
        }


   




function getLookbacksAndStatModels() {


        currentH = +document.getElementsByName('horizon')[0].value;
        currentP = +document.getElementsByName('percentile')[0].value;

        maxLookback = Math.floor( currentP*totalReturns/(currentH*5) );
        
        
        /*
        take while < Max
        
        W,M,Q,Y
        5,21,63,252
        append max at the end
        
        */
        
        console.log(currentH);
        console.log(maxLookback);
        
        if (currentH == 1)      {l1 = [5,21,63,252]}
        else if (currentH == 5) {l1 = [4,12,52]}
        else                    {l1 = [3,12]}
        
        
        lookbacks = l1.filter(function(x){return x < maxLookback && x > 1;});
        
        lookbacks.push(maxLookback);
        
        //lookbacks.push(maxLookback);
        
        statModels = ["Historical","Normal","T3","T4","T5"];//"Normal EWMA",


        return statModels.map( function (statModel) {
                        return lookbacks.map( function (lookback) {
                                return [lookback,statModel]
                                });
                        }).reduce( function (a, b) {
                                return a.concat(b);
                                });
        }
        
    

        
     


