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


var squareContainer;

function initialGraphSetup(){
        //remove help message
        d3.selectAll("#p").remove();
        
        //remove dotted style   
        d3.selectAll("#dropfile").style("border-style","none");
        
        squareContainer = d3.select("svg").append("g").attr("id","gSquares");
        }


var count = 0;

function updatePage(latestResult) {
        
        //globalResults2 = globalResults.slice();
        
        globalResults2 = globalResults
                                .slice()
                                .filter(function(x){return (isNaN(x.var) == false) });
        
        if (globalResults2.length <= 1){
                initialGraphSetup();
                }
        
        //join
        squares = squareContainer
                .selectAll("rect")
                //filter out var NaNs
                .data( globalResults2
                        , 
                        function(d,i){return i;} );
        
        ssArray = globalResults2.map( function(x){
                return x.sampleSize;
                });
        
        maxSS = Math.max.apply(null,ssArray.map(function(z){return z;}));
        
        
        squareWidth = function(d){
                return 100;
                }
        
        maxSW = squareWidth({sampleSize:maxSS});
        
        margin = {"left": 1+0.5*maxSW, "right":maxSW, "top":1+0.5*maxSW, "bottom":maxSW}
        
        width = parseInt(d3.select("svg").style("width")) - margin.left - margin.right;
        height = parseInt(d3.select("svg").style("height")) - margin.top - margin.bottom;
        
        breachDiff = function(x){
                return x.breaches/x.sampleSize-x.percentile;
                }
        
        xArray = globalResults2.map( function(x){
                return breachDiff(x);
                });
               
        yArray = globalResults2.map( function(x){
                return x.var;
                });   
                
        lowestAbsPoF = Math.min.apply(null,xArray.map(function(z){return Math.abs(z);}));
                
        x = d3	.scale	
		.linear()
		.domain([ Math.min.apply(null,xArray), Math.max.apply(null,xArray) ])
		.range([ 0, width ]);
        
        y = d3	.scale
		.linear()
		.domain([ Math.min.apply(null,yArray), Math.max.apply(null,yArray) ])
		.range([ height, 0 ]);
        
        //enter
        squares .enter()
	        .append("rect")
	        .attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")")
	        .attr("x", function (d) { return x(breachDiff(d)) - 0.5*squareWidth(d); })
	        .attr("y", function (d) { return y(d.var) - 0.5*squareWidth(d) ; })
	        .attr("width", function (d) { return squareWidth(d); })
	        .attr("height", function (d) { return squareWidth(d); })
	        .attr("rx", 1)
		.attr("ry", 1)
		.style("stroke", function (d) { return colorize(d.model); })
		.style("fill", function (d) { return colorize(d.model); })
	        .append("title")
	        .text(function (d) {    //console.log(d);
	                                return  "Breaches off by: " + (Math.round(breachDiff(d) * 10000)) + 
	                                        "bps / VaR: $" + getDollarReturn(d.var) + 
	                                        " / Model: " + d.model +
	                                        " / Lookback: " + getLookback(d) +
	                                        " / Sample Size: " + d.sampleSize; 
	                                });
           
        //update other quares with new axes
        //crown champion   
        squares .transition()
                .duration(500)
	        .attr("x", function (d) { return x(breachDiff(d)) - 0.5*squareWidth(d); })
	        .attr("y", function (d) { return y(d.var) - 0.5*squareWidth(d)  })
	        .attr("id",function(d){
	                //if ( Math.abs(d.breaches / d.sampleSize - d.percentile) == lowestAbsPoF ){
	                if (    d.kupiecTest == sortResults(globalResults.slice())[0].kupiecTest &&
	                        d.var == sortResults(globalResults.slice())[0].var
	                          ){
	                        return "circle";
	                        }
	                else {
	                        return "rectangle";
	                        }
                        });
                        
                        
                                
        squares .exit();
        }

function sortResults(globalResults){
        return globalResults.sort( function(a,b) {
                //if ( Math.abs(a.breaches/a.sampleSize-a.percentile) < Math.abs(b.breaches/b.sampleSize-b.percentile) ){
                if ( a.kupiecTest < b.kupiecTest ){
                        return -1;
                        }
                //report lowest var if in tie breaker situation
                else if (a.kupiecTest == b.kupiecTest){
                        if ( a.var < b.var ){
                                return -1;
                                }
                        else {
                                return 1;
                                }
                        }
                else {
                        return 1;
                        }
                });
        }
        
function updateHTML(globalResults){
        //sortedGlobalResults = globalResults.slice();
        sortedGlobalResults = sortResults(globalResults.slice());

        //update html
        document.getElementById('varResult').innerHTML = "$" + getDollarReturn(sortedGlobalResults[0].var);
        document.getElementsByName('model')[0].innerHTML = sortedGlobalResults[0].model;
        document.getElementsByName('lookback')[0].innerHTML = getLookback(sortedGlobalResults[0]);
        document.getElementsByName('pvalue')[0].innerHTML = getPValue(sortedGlobalResults[0].kupiecTest)+"%";
        document.getElementsByTagName('title')[0].innerHTML = Math.round(100 * pCount / lbXsm.length) + "% / VARIFY / Value at Risk, backtested";
        
        
        //console.log(sortedGlobalResults);
        }

function getPValue(x){
        r = Math.max(   Math.round(
                                100*jStat.chisquare.cdf( Math.abs(x), 1 )
                                ),
                        0.1);
                        
        if ( isNaN(r) ) {return 100;}
        else {return r;}
        
        }

function getLookback(r){

        if (r.horizon == 1) { period = "day"; }
        else if (r.horizon == 5) { period = "week"; }
        else { period = "month"; }
        
        //length = Math.round(r.lookback / r.horizon);
        
        return r.lookback+" "+period+"s";
        }
        
        
function getDollarFormat(v){
        //console.log(v+"".length);
        if ((v+"").indexOf(".") == -1){
                return v+".00";
                }
        else if ((v+"").length - (v+"").indexOf(".") < 3){
                //
                
                //console.log((v+"").length);
                //console.log((v+"").indexOf("."));
                //console.log(v);
                
                return v+"0";
                }
        else {
                return v;
                }
        }

function getDollarReturn(v){
        return "-"+getDollarFormat(
                Math.round( ( 1 - Math.exp(v) ) * globalCurrentPrice * 100 ) / 100
                );
        }


function colorize(str) {
        for (
            var i = 0, hash = 0; i < str.length;
            hash = str.charCodeAt(i++) + ((hash << 5) - hash));
            color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777216)).toString(16);
        return '#' + Array(6 - color.length + 1).join('0') + color;
}
     

function wipe(){
        globalResults = [];
        d3      .select("svg")
                .selectAll("g")
                .remove();
        pCount = 0;
        }
		        
        
        
    

        
     


