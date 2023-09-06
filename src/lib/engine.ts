import {ref} from "vue";
import type {ContractBuild, DeployStep} from "@/lib/types";
import {CONSTRUCTOR, FUNCTION, PROXY_CONSTRUCTOR, PROXY_UPGRADE} from "@/lib/types";
import {ethers} from "ethers";
import {callContract, deployContract, deployProxyContract, upgradeProxyContract} from "@/lib/upgrade";

export default class ContractEngine {

    private readonly provider:ethers.providers.Web3Provider
    constructor(provider : ethers.providers.Web3Provider) {
        this.provider = provider
    }

    async run(abiMap : Map<string,ContractBuild>, deployInfo: ref<DeployStep[]>) {
        for(let deployStep of deployInfo.value){
            const contractBuild = abiMap.get(deployStep.Contract.name)
            if(contractBuild === undefined){
                throw new Error(`cannot find contract ${deployStep.Contract.name} `)
            }
            let abi = contractBuild.abi
            let bytecode = contractBuild.bytecode

            for(let step of deployStep.steps){
                if(step.type === CONSTRUCTOR){
                    try {
                        const params = this.paramReplace(step.params,deployInfo)
                        console.log(params)
                        deployStep.Contract.address = await deployContract(this.provider,abi, bytecode, ...params)
                        step.status = "SUCCESS"
                    }catch (e) {
                        step.status = "FAIL"
                        console.log(e)
                        break
                    }
                }else if(step.type === FUNCTION){
                    // console.log("function",step.method)
                    const params = this.paramReplace(step.params,deployInfo)
                    try {
                        const tx = await callContract(this.provider, abi, deployStep.Contract.address, step.method, ...params)
                        console.log(tx)
                        step.status = "SUCCESS"
                    }catch (e) {
                        step.status = "FAIL"
                        console.log(e)
                        break
                    }
                }else if(step.type === PROXY_CONSTRUCTOR){
                    const params = this.paramReplace(step.params,deployInfo)
                    try {
                        deployStep.Contract.address = await deployProxyContract(this.provider, abi, bytecode,step.method, params)
                    }catch (e){
                        console.log(e)
                        step.status = "FAIL"
                        break
                    }
                }else if(step.type === PROXY_UPGRADE) {
                    const params = this.paramReplace(step.params,deployInfo)
                    try {
                        deployStep.Contract.address = await upgradeProxyContract(this.provider, abi, bytecode,step.method, params,deployStep.Contract.address)
                    }catch (e){
                        console.log(e)
                        step.status = "FAIL"
                        break
                    }
                }
            }
        }
    }

    paramReplace(params: string[],deployInfo:  ref<DeployStep[]>) {
        if(params.length === 0 ){
            return params
        }
        for(let i = 0 ; i< params.length; i++){
            if (params[i].startsWith("$")){
                let contractName = params[i].substring(1).split(".")[0]
                let attr = params[i].substring(1).split(".")[1]
                let deploy = deployInfo.value.find((t: DeployStep) => t.Contract.name === contractName)
                if(deploy === undefined){
                    continue
                }
                params[i] = deploy.Contract[attr]
            }
        }
        return params
    }




}