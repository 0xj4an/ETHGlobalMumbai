import { parseAbi } from "viem";

/**
 * ABIs as deployed on mainnet, checked with eth_simulateV1 against mainnet
 * state on 2026-11-05 (ADR-0002). The deployed PermissionedResolver takes the
 * DNS-encoded name, not the namehash, in its setters.
 */
export const resolverAbi = parseAbi([
  "function setText(bytes name, string key, string value)",
  "function grantSetterRoles(bytes setterCall, address account)",
]);

export const universalResolverAbi = parseAbi([
  "function resolve(bytes name, bytes data) view returns (bytes, address)",
]);

export const textAbi = parseAbi(["function text(bytes32 node, string key) view returns (string)"]);

export const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);

export const registryInitAbi = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants)",
]);

export const resolverInitAbi = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)",
]);

export const ethRegistryAbi = parseAbi([
  "function setSubregistry(uint256 tokenId, address registry)",
  "function getSubregistry(string label) view returns (address)",
]);

export const userRegistryAbi = parseAbi([
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function getResolver(string label) view returns (address)",
]);
