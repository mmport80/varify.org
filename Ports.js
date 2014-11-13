

/*
Copyright (C) 2014 John Orford

This file is part of elm-var-backtesting.

elm-var-backtesting is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

elm-var-backtesting is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with elm-var-backtesting.  If not, see <http://www.gnu.org/licenses/>.
*/



//text output -- it no html or graphical output

function getWorker() {
        return Elm.worker(
	                Elm.FileUpload,
	                {openFromFile: "", percentile: 0.05, horizon: 5}
	        );         
        }


//have individual fileupload variable for each result - one for each process
var fileupload = getWorker();






document.getElementsByTagName('input')[0]
	.onchange = function (e) {
		reader = new FileReader();
		reader.onload = function (event) {
			fileData = event.target.result;	
			//file's text data is sent to 'openfromfile' port
			fileupload.ports.openFromFile.send(fileData);
			}
		reader.readAsText(this.files[0]);
		};
	
        
        
//text output -- it no html or graphical output
document.getElementsByTagName('select')[0]
	.onchange = function (e) {
                data = +this.value;
		fileupload.ports.horizon.send(data);
		};      
document.getElementsByName('percentile')[0]
	.onchange = function (e) {
                data = +this.value;
		fileupload.ports.percentile.send(data);
		};      
        
        
        
        
        
        
     
fileupload.ports.xoxo.subscribe(
	function(output) {
		document.getElementById('output').innerHTML = output[0].breaches;
                console.log (output);
                console.log (output.length);
                console.log (output[0]);
		}
	);
