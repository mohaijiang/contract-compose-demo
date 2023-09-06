<script setup lang="ts">

import {onMounted, ref} from "vue";

import {ethers} from "ethers";
import {
    deployContract,
    getAdminAddress,
    getCode,
    getITransparentUpgradeableProxyFactory,
    isEmptySlot
} from "@/lib/upgrade"
import {
    ERC20_ABI,
    ERC20_BYTECODE,
    Logic1,
    Logic1_ByteCode,
    Logic2,
    Logic2_ByteCode,
    SimpleUpgrade,
    SimpleUpgrade_Bytecode
} from "@/components/contracts/contracts";
import {ContractInterface} from "@ethersproject/contracts/src.ts";
import {BytesLike} from "@ethersproject/bytes";

import ERC1967Proxy
    from '../lib/ERC1967Proxy.json'
import {getContractAddress} from "ethers/lib/utils";
import ContractEngine from "@/lib/engine";
import type {ContractBuild, DeployStep} from "@/lib/types";
import {CONSTRUCTOR, ERC1967_ABI, ERC1967_BYTECODE, FUNCTION, PROXY_CONSTRUCTOR, PROXY_UPGRADE} from "@/lib/types";
// import { Manifest, getAdminAddress, getCode, isEmptySlot } from '@openzeppelin/upgrades-core';
// import {address} from "hardhat/internal/core/config/config-validation";



  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const proxyAddress = ref('')

  const stageData = ref({})

  const abiMap = new Map<String,ContractBuild>()
  abiMap.set("Logic1", {
      abi: Logic1,
      bytecode: Logic1_ByteCode
  })
  abiMap.set("Logic2", {
      "abi": Logic2,
      "bytecode": Logic2_ByteCode
  })
  abiMap.set("SimpleUpgrade", {
      "abi": SimpleUpgrade,
      "bytecode": SimpleUpgrade_Bytecode
  })
  abiMap.set("ERC20", {
      abi: ERC20_ABI,
      bytecode: ERC20_BYTECODE,
  })

  const deployInfo:  ref<DeployStep[]> = ref([
    {
      Contract: {
          name: "Logic1",
          address: '',
          proxy: false

      },
      steps: [
        {
            type: "constructor",
            method: "",
            params: [],
            status: "PENDDING",
        },
      ]
    },
    {
      Contract: {
        name: "SimpleUpgrade",
        address: '',
          proxy: false
      },
      steps: [
          {
              type: "constructor",
              method: "",
              params: ["$Logic1.address"],
              status: "PENDDING",
          },
          {
              type: "function",
              method: "upgrade",
              params: ["$Logic1.address"],
              status: "PENDDING",
          }
      ]
    }
  ])

  // const deployInfo: ref<DeployStep[]> = ref([
  //     {
  //         Contract: {
  //             name: "ERC20",
  //             address: "",
  //             proxy: true,
  //         },
  //         steps: [{
  //             type: PROXY_CONSTRUCTOR,
  //             method: "",
  //             params: [],
  //             status: "PENDDING",
  //         }]
  //
  //     }
  // ])

  //0x36a7da824CDc4Ce279D654058c0345f3BFC417A0
  // const deployInfo: ref<DeployStep[]> = ref([
  //     {
  //         Contract: {
  //             name: "ERC20",
  //             address: "0x36a7da824CDc4Ce279D654058c0345f3BFC417A0",
  //             proxy: true,
  //         },
  //         steps: [{
  //             type: PROXY_UPGRADE,
  //             method: "",
  //             params: [],
  //             status: "PENDDING",
  //         }]
  //
  //     }
  // ])
  const engine = async (deployInfo: DeployStep[]) => {


  }


  const hookEngine = async () => {
      await engine(deployInfo.value)
  }

  const deployLogic1 = async() => {
      const signer = provider.getSigner()
      let factory = new ethers.ContractFactory(Logic1,Logic1_ByteCode,signer)

      const contract = await factory.deploy()
      await contract.deployTransaction.wait();
      console.log(contract.address)
      return contract.address
  }

  const deployProxy = async( targetAddress :string) => {
      const signer = provider.getSigner()
      let factory = new ethers.ContractFactory(SimpleUpgrade,SimpleUpgrade_Bytecode,signer)
      const contract = await factory.deploy(targetAddress)
      await contract.deployTransaction.wait();
      console.log(contract.address)
      proxyAddress.value = contract.address
      return contract.address
  }

  const deployProxy2 = async (targetAddress: string) => {
      const proxyAddress = await deployContract(provider,SimpleUpgrade,SimpleUpgrade_Bytecode,targetAddress)
      console.log(proxyAddress)
      return proxyAddress
  }

  const upgradeProxy = async (proxyContractAddress: string, targetContractAddress: string) => {
      const signer = provider.getSigner()
      const proxyContract = new ethers.Contract(proxyContractAddress, SimpleUpgrade, signer);
      const tx = await proxyContract.upgrade(targetContractAddress)
      await tx.wait()
      return tx
  }

  const deployAll = async ()=> {
      // const logicAddress = await deployContract(Logic1, Logic1_ByteCode)
      const logicAddress = await deployLogic1()
      const proxyAddress = await deployContract(provider,SimpleUpgrade,SimpleUpgrade_Bytecode,logicAddress)
      // const proxyAddress = await deployProxy(logicAddress)
      const tx = await upgradeProxy(proxyAddress,logicAddress)
      console.log(tx)
  }

  const deployLogic2 = async () => {
      const signer = provider.getSigner()
      let factory = new ethers.ContractFactory(Logic2,Logic2_ByteCode,signer)

      const contract = await factory.deploy()
      await contract.deployTransaction.wait();
      console.log(contract.address)
      return contract.address
  }

  const hardhat = async () => {
      const signer = provider.getSigner()
      // 先部署erc20合约
      let factory = new ethers.ContractFactory(ERC20_ABI,ERC20_BYTECODE,signer)
      const contract = await factory.deploy()
      await contract.deployTransaction.wait();
      const fragment = factory.interface.getFunction('initialize')
      const data =  factory.interface.encodeFunctionData(fragment,[])
      console.log(data)
      console.log("erc20 address:", contract.address)
           const ProxyFactory =  new ethers.ContractFactory(ERC1967_ABI,ERC1967_BYTECODE,signer)
      const proxyInstance = await ProxyFactory.deploy(contract.address,data)
      await proxyInstance.deployTransaction.wait();
      const address: string = getContractAddress({
          from: await factory.signer.getAddress(),
          nonce: proxyInstance.deployTransaction.nonce,
      });
      console.log(address)

      console.log(proxyInstance)

      // const proxyContract = new ethers.Contract(address, ERC20_ABI, signer);
      // const owner = await proxyContract.owner()
      // console.log("owner: ",owner )
      //
      // const dai = ethers.utils.parseUnits("1.0", 18);
      // const tx = await proxyContract.mint('0xcE83951b7c830896f4A39b4014633bBA22c3095c',dai)
      // console.log('tx:',tx)

      const ITransparentUpgradeableProxyFactory = await getITransparentUpgradeableProxyFactory(signer);
      const proxy = ITransparentUpgradeableProxyFactory.attach(address);
      const tx = await proxy.upgradeTo(contract.address)
      //
      // console.log(tx)

  }

  const test = async ()=> {
      const engine = new ContractEngine(provider)
      await engine.run(abiMap,deployInfo)
      console.log('test success')
  }

  onMounted(async() => {
      await provider.send("eth_requestAccounts", []);
  })
</script>

<template>
  <h1> contract </h1>
  <div>
    <code>
      {{ deployInfo}}
    </code>

    <ul>
<!--        <li><button @click="deployLogic1"> deploy logic1</button></li>-->
<!--        <li><button @click="deployProxy2('0xAA41aF55D213491862E50F91394Bfd24CeB2485f')">deploy proxy</button></li>-->
<!--        <li><button @click="upgradeProxy('0x3dF9e808E3c96a6a30B4511493Df35C6A7CCb602','0x037C4745ECd5F281Bfd5639CB36391ce799989aA')">upgradeProxy</button></li>-->

<!--        <li><button @click="deployAll">deployAll</button></li>-->

        <li><button @click="hookEngine">engine</button></li>
        <li><button @click="test">test</button></li>
    </ul>

      <div>
          <label v-for="item in deployInfo">
              {{item.Contract.name}}
              <ul>
                  <li v-for="step in item.steps">
                      {{step.status}}
                  </li>
              </ul>
              <br/>
          </label>
      </div>

      <div>
          <button @click="hardhat">hardhat</button>
      </div>
  </div>
</template>

<style scoped>

</style>
