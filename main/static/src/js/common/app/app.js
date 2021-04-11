"use strict"

import {registerCustomFilter} from "../../templates/vtl/lib/context/scope"
import {getImagePath, getMinImagePath } from "../utils"
import initPage from "./pageLoader"

import initListeners from "./listeners"
import initComponents from "../../templates/components"

initComponents();

registerCustomFilter("media", getImagePath);
registerCustomFilter("min", getMinImagePath);
registerCustomFilter("enumerate", Object.entries);

$(document).ready(()=>
{
    initPage();
    initListeners();
});
