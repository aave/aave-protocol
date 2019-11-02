import { testEnvProvider } from "../utils/truffle/dlp-tests-env";
import { ContractsInstancesOrigin, ITestEnv } from "../utils/types";
import BigNumber from "bignumber.js";


contract("WadRayMath", async (accounts) => {
    let _testEnvProvider: ITestEnv
    let _wadRayMathInstance: Truffle.ContractInstance

    const oneWad = new BigNumber(Math.pow(10, 18)).toFixed();
    const oneRay = new BigNumber(Math.pow(10, 27)).toFixed();

    before("Initializing LendingPool test variables", async () => {
        _testEnvProvider = await testEnvProvider(artifacts, accounts, ContractsInstancesOrigin.Json)

        const { deployedInstances: { wadRayMathInstance } } = _testEnvProvider
        _wadRayMathInstance = wadRayMathInstance
    });


    it("Tests wad multiplication 1wad*1wad", async () => {
        // TODO: review ignore
        // @ts-ignore
        const mulResult = await _wadRayMathInstance.wadMul(oneWad, oneWad);
        expect(mulResult.toString()).to.be.equal(oneWad);
    });

    it("Tests wad multiplication 0*1wad", async () => {
        // TODO: review ignore
        // @ts-ignore
        const mulResult = await _wadRayMathInstance.wadMul("0", oneWad);
        expect(mulResult.toString()).to.be.equal("0");
    });

    it("Tests wad division 1wad/1wad", async () => {
        // TODO: review ignore
        // @ts-ignore
        const mulResult = await _wadMathInstance.wadDiv(oneWad, oneWad);
        expect(mulResult.toString()).to.be.equal(oneWad);
    });

    it("Tests wad division 0/1wad", async () => {
        // TODO: review ignore
        // @ts-ignore
        const mulResult = await _wadRayMathInstance.wadDiv("0", oneWad);
        expect(mulResult.toString()).to.be.equal("0");
    });


    it("Tests ray multiplication 1 ray*1 ray", async () => {
        // TODO: review ignore
        // @ts-ignore
        const mulResult = await _wadRayMathInstance.rayMul(oneRay, oneRay);
        expect(mulResult.toString()).to.be.equal(oneRay);
    });

    it("Tests ray multiplication 0*1 ray", async () => {
        // TODO: review ignore
        // @ts-ignore
        const mulResult = await _wadRayMathInstance.rayMul("0", oneRay);
        expect(mulResult.toString()).to.be.equal("0");
    });

    it("Tests ray division 1 ray/1 ray", async () => {
        // TODO: review ignore
        // @ts-ignore
        const mulResult = await _wadRayMathInstance.rayDiv(oneRay, oneRay);
        expect(mulResult.toString()).to.be.equal(oneRay);
    });

    it("Tests ray division 0/1 ray", async () => {
        // TODO: review ignore
        // @ts-ignore
        const mulResult = await _wadRayMathInstance.rayDiv("0", oneRay);
        expect(mulResult.toString()).to.be.equal("0");
    });

    it("Tests rayToWad", async () => {
        // TODO: review ignore
        // @ts-ignore
        const result = await _wadRayMathInstance.rayToWad(oneRay);
        expect(result.toString()).to.be.equal(oneWad);
    });

    it("Tests wadToRay", async () => {
        // TODO: review ignore
        // @ts-ignore
        const result = await _wadRayMathInstance.wadToRay(oneWad);
        expect(result.toString()).to.be.equal(oneRay);
    });
});