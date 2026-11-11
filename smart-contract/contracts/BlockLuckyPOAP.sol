// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract BlockLuckyPOAP is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public totalMinted;
    string private baseTokenUri;

    mapping(uint256 => uint256) public roundOfToken;
    mapping(uint256 => mapping(address => uint256)) public badgeOf;

    event BadgeMinted(uint256 indexed tokenId, uint256 indexed roundId, address indexed participant);
    event BaseUriUpdated(string baseUri);

    error ZeroAddressNotAllowed();
    error BadgeAlreadyMinted(uint256 roundId, address participant);
    error SoulboundToken(uint256 tokenId);

    constructor(address admin, string memory baseUri) ERC721("BlockLucky EtherBay POAP", "BLPOAP") {
        if (admin == address(0)) revert ZeroAddressNotAllowed();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        baseTokenUri = baseUri;
    }

    function mintBadge(address participant, uint256 roundId) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (participant == address(0)) revert ZeroAddressNotAllowed();
        if (badgeOf[roundId][participant] != 0) revert BadgeAlreadyMinted(roundId, participant);

        tokenId = ++totalMinted;
        roundOfToken[tokenId] = roundId;
        badgeOf[roundId][participant] = tokenId;
        _safeMint(participant, tokenId);

        emit BadgeMinted(tokenId, roundId, participant);
    }

    function setBaseUri(string calldata baseUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseTokenUri = baseUri;
        emit BaseUriUpdated(baseUri);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(baseTokenUri, roundOfToken[tokenId].toString(), ".json");
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundToken(tokenId);
        return super._update(to, tokenId, auth);
    }
}
