// this shitty class stores data about class relations
// like this tag has that main tag or that compound tag
import IfTag from "../tags/IfTag"
import ElseIfTag from "../tags/ElseIfTag"
import ElseTag from "../tags/ElseTag"
import EndIfTag from "../tags/EndIfTag"
import ForTag from "../tags/ForTag"
import EndForTag from "../tags/EndForTag"
import ExecuteTag from "../tags/ExecuteTag"
import LetTag from "../tags/LetTag"
import IncludeTag from "../tags/IncludeTag"

import ForBlock from "../blocks/ForBlock"
import IfBlock from "../blocks/IfBlock"
import {NumberLiteral, BooleanLiteral, StringLiteral} from "../evaluate/Literals"
import VariableOperand from "../evaluate/VariableOperand"

import PlusOperator from "../operator/PlusOperator"
import DotOperator from "../operator/DotOperator"
import CommaOperator from "../operator/CommaOperator"
import EqualsOperator from "../operator/logical/EqualsOperator"
import MinusOperator from "../operator/MinusOperator"
import MultiplicationOperator from "../operator/MultiplicationOperator"
import DivisionOperator from "../operator/DivisionOperator"
import OrOperator from "../operator/logical/OrOperator"
import FilterOperator from "../operator/FilterOperator"
import NewOperator from "../operator/NewOperator"
import NotEqualOperator from "../operator/logical/NotEqualOperator"
import NotOperator from "../operator/logical/NotOperator"
import RemainderOperator from "../operator/RemainderOperator"
import GreaterOperator from "../operator/logical/GreaterOperator"
import LessOperator from "../operator/logical/LessOperator"
import AndOperator from "../operator/logical/AndOperator"

import {BraceBlock, RoundBracketBlock, SquareBracketBlock} from "../parse/BraceBlocks"

class Linker
{
    static classMap = {
        IfTag,
        ElseIfTag,
        IfBlock,
        ForBlock,
        IncludeTag,
        LetTag,
        ExecuteTag,
        EndForTag,
        ForTag,
        EndIfTag,
        ElseTag,
    }

    static propertyMap = {}

    static generalProperties =
    {
        registeredTags:
            [
                LetTag, IncludeTag, ExecuteTag,
                IfTag, EndIfTag, ElseIfTag, ElseTag,
                ForTag, EndForTag
            ],
        registeredOperands:
            [
                NumberLiteral,
                BooleanLiteral,
                VariableOperand,
                StringLiteral,
            ],
        registeredOperators:
            [
                PlusOperator,
                DotOperator,
                CommaOperator,
                EqualsOperator,
                MinusOperator,
                MultiplicationOperator,
                DivisionOperator,
                OrOperator,
                FilterOperator,
                NewOperator,
                NotEqualOperator,
                NotOperator,
                RemainderOperator,
                GreaterOperator,
                LessOperator,
                AndOperator
            ],
        braceBlocks:
        [
            RoundBracketBlock,
            SquareBracketBlock
        ]
    }

    static getClassName(cls)
    {
        for (let key of Object.keys(this.classMap))
        {
            if (this.classMap[key] == cls || this.classMap[key] == cls?.constructor)
                return key;
        }
    }

    static set(cls, properties)
    {
        //console.log("set", cls.name, properties);
        this.propertyMap[this.getClassName(cls)] = properties;
    }

    static initMap()
    {

        this.set(IfTag,
        {
            __mainTagClass: IfTag,
            __related_tags: [ElseIfTag, ElseTag],
            __closeTagClass: EndIfTag,
            __blockClass: IfBlock,
        })

        this.set(ElseIfTag,
        {
             __related_tags: [],
             __mainTagClass: IfTag,
        })

        this.set(ElseTag,
        {
             __related_tags: [],
             __mainTagClass: IfTag,
        })

        this.set(EndIfTag,
        {
             __related_tags: [],
             __mainTagClass: IfTag,
        })

        this.set(ForTag,
        {
             __blockClass: ForBlock,
             __closeTagClass: EndForTag,
             __mainTagClass: ForTag,
             __related_tags: [],
        })

        this.set(EndForTag,
        {
             __related_tags: [],
             __mainTagClass: ForTag,
        })

        this.set(ExecuteTag,
        {
            __related_tags: [],
        })

        this.set(LetTag,
        {
            __related_tags: [],
        })

        this.set(IncludeTag,
        {
            __related_tags: [],
        })

        this.set(IfBlock,
        {
            __mainTagClass: IfTag
        })

        this.set(ForBlock,
        {
            __mainTagClass: ForTag
        })
    }

    static _ensureClassType(possible_instance)
    {
        if (typeof possible_instance === "function"){
            return possible_instance;
        }
        if (typeof possible_instance === "object"){
            return possible_instance.constructor
        }
    }

    static _getName(cls)
    {
        // there is problem somewhere here with class map
        this.initMap();
        if (typeof cls === "string")
            return cls;

        let type = this._ensureClassType(cls)
        return this.getClassName(type);
    }

    static getMap(cls)
    {
        return this.propertyMap[this._getName(cls)]
    }

    static getMainTagClass(cls)
    {
        return this.getMap(cls).__mainTagClass;
    }

    static getBlockClass(cls)
    {
        return this.getMap(cls).__blockClass;
    }

    static getRelatedTags(cls)
    {
        return this.getMap(cls).__related_tags;
    }

    static getClosingClass(cls)
    {
        return this.getMap(cls).__closeTagClass
    }

    static isCompoundable(cls)
    {
        if (this.getMainTagClass(cls))
        {
            return this.getMainTagClass(cls).isCompoundStart();
        }

    }
    static getRegisteredTags()
    {
        return this.generalProperties.registeredTags
    }

    static getRegisteredOperands()
    {
        return this.generalProperties.registeredOperands;
    }

    static getRegisteredOperators()
    {
        return this.generalProperties.registeredOperators;
    }

    static getBraceBlocks()
    {
        return this.generalProperties.braceBlocks;
    }

}
export default Linker
