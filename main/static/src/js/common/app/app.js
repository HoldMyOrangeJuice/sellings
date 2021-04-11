"use strict"

import {registerCustomFilter} from "../../templates/vtl/lib/context/scope"
import {getImagePath, getMinImagePath } from "../utils"

import initListeners from "./listeners"
import initComponents from "../../templates/components"

initComponents();
initListeners();

registerCustomFilter("media", getImagePath);
registerCustomFilter("min", getMinImagePath);
registerCustomFilter("enumerate", Object.entries);
