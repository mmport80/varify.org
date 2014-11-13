{--
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
--}


module FileUpload where

import String
import List
import Dict

import Maybe


import Stats (..)
import Utils (..)

import Json

--import Ports (..)

------------------------------------------------------------------------

--calculate var
fileParameters = {priceColumn = "Adjusted Close"}


------------------------------------------------------------------------



------------------------------------------------------------------------

--return of array of params and results
--return each individual param and result set

--type 'signal string'
port openFromFile : Signal String
port percentile : Signal Float
port horizon : Signal Int

--different 'output' port for each calc
--signal in array of strings out
--or a "signal string array" type

--20

type Result = {var:Float,breaches:Float, model:String, lookback:Int, percentile:Float, horizon:Int}
type Model = {description:String, functionName : (Float,[Float]) -> Float }

port xoxo :  Signal [Result]
port xoxo =  (\f p h -> 
                generateModelLookbackCombos (   [{description="Historical",functionName=getPercentileValue},{description="Normal",functionName=getNormalVar},{description="T3",functionName=getT3Var},{description="T4",functionName=getT4Var},{description="T5",functionName=getT5Var}],
                                                [20,60,252,504,756]     )
                |> List.map ( \(sm, l) -> init (sm, l, f, p, h) )
                |> List.sortBy .breaches
                )          <~ openFromFile ~ percentile ~ horizon



------------------------------------------------------------------------


--array of statmodels
--array of lookbacks

------------------------------------------------------------------------

generateModelLookbackCombos : ([ Model ],[Int]) -> [ (Model,Int) ]
generateModelLookbackCombos (statModels,ls) = statModels
                                                |> List.concatMap ( \sm ->
                                                        ls |> List.map ( \l ->
                                                                (sm,l)
                                                                )
                                                        )


--aim to have every step obviously piped together
init: ( Model, Int, String, Float, Int) -> Result
init (statModel,  l,fileData, p, h) = fileData      --process file    
                --used for everything            
                |> process
                |> \ms -> (ms, h)
                --filters in every 'horizonth' price
                |> horizonFilter 
                --calculates periodic returns
                |> getReturns
                
                --Demean
                |> demean
                --builds backtestable lists, of a single return and a list of returns to calc var with
                --build array of these with different lookbacksand models
                
                
                --pass p and statModel into backtest
                |> \ns -> (ns,p,l,statModel.functionName)
                |> backTest
                --calculates var for current and each previous period
                
                --
                --get results
                |> (\i ->(
                        --find current var
                        --sure this is current var??????????????
                        i |> List.head |> \(_,v) -> v,
                        --count var breaches
                        i |> countBreaches
                        --get difference with percentile
                          |> (+) -p
                          |> abs
                        ))
                |> (\(v,b) -> {var= v, breaches= b, model= (statModel.description), lookback=l, percentile=p, horizon=h})
                

--var number (n+1), return (n)
--latest
backTest : ([Float],Float,Int,(Float,[Float]) -> Float) -> [(Maybe Float,Float)]
--ensure that comparison return is <horizon> in the future
--[(return,[returns]),...,(return,[returns])]
backTest (xs,p,l,statModel) =  
                        --return, var
                        [
                                (xs |> safeHead, xs |> \ns -> (l,ns) |> lookback ) 
                                |> \(r,rs) -> 
                                        (r, rs 
                                                |> \ns -> 
                                                        (p,ns) 
                                                        |> statModel ) 
                                |> \(r,v) -> (r,v)
                                ]
                        ++
                        if 
                           | (xs |> List.length) <= l ->    
                                []
                           | (xs |> List.length) > l  ->       
                                (xs |> safeTail |> \ns -> (ns,p,l,statModel) |> backTest)
                           

countBreaches : [(Maybe Float,Float)] -> Float
countBreaches xs = xs   |> unzip 
                        |> (    \(rs, vs) -> 
                                safeTail' rs
                                |> (safeTail vs 
                                        |> zipWith ( \v r -> (Maybe.maybe 0 (identity) r) < v )    )
                                |> List.filter (\x -> x == True)
                                |> List.length
                                |> toFloat
                                )
                        |> (*) (xs |> List.length |> toFloat |> (/) 1)
                        




--
process : String -> [Float]
process x = x   |> String.lines 
                |> List.map splitUsingCommas 
                |> dictionarify 
                --convert back to a list in order to ouput
                |> List.map (Dict.getOrElse "" fileParameters.priceColumn)
                |> List.filterMap String.toFloat
                       

lookback : (Int,[Float]) -> [Float]
lookback (l,xs) = xs |> List.take l

--backtesting
--calculate var and check against next day's return
--tot up number of breaches
--breaches ~= percentile?


--var is seperate from backtesting
--pop off head
--generate var
--compare head to var - check whether there's a breach


--horizon - 1 day, 1 week, 1 month
--sampling
--need to add dynamic bit for % 5 etc.
horizonFilter : ([Float],Int) -> [Float]
horizonFilter (ns,h) = ns   |> List.indexedMap      (,) 
                  |> List.filter          ( \(i,v) -> (i `rem` h) == 0 )
                  |> List.map             ( \(i,v) -> v )


getReturns : [Float] -> [Float]
getReturns xs = xs      |> safeTail
                        --get both ends of the list and zip 'em up to get returns
                        |> ( xs         
                                        --remove last element - 'opposite of tail'
                                        |> safeTail'
                                        |> List.zipWith ( \x y -> logBase e (x/y) )
                                        )





