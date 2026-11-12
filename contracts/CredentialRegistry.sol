// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CredChain Academic Credential Registry
/// @notice Course prototype. Full academic credentials remain off-chain.
contract CredentialRegistry {
    address public immutable administrator;
    mapping(address => bool) public didRegistered;

    struct Issuer { string name; bool approved; }
    mapping(address => Issuer) public issuers;

    struct Credential {
        bytes32 digest;
        address issuer;
        address student;
        uint64 expiresAt;
        bool revoked;
        bool exists;
    }
    mapping(bytes32 => Credential) public credentials;

    event DIDRegistered(address indexed controller);
    event IssuerUpdated(address indexed issuer, string name, bool approved);
    event CredentialIssued(bytes32 indexed id, bytes32 digest, address indexed issuer, address indexed student, uint64 expiresAt);
    event CredentialRevoked(bytes32 indexed id, address indexed issuer);

    constructor() { administrator = msg.sender; }

    modifier onlyAdministrator() {
        require(msg.sender == administrator, "Administrator only");
        _;
    }

    /// @dev The app derives did:pkh:eip155:<chainId>:<controller> from this account.
    ///      Registration proves transaction control of the account, not a real-world identity.
    function registerDID() external {
        require(!didRegistered[msg.sender], "Already registered");
        didRegistered[msg.sender] = true;
        emit DIDRegistered(msg.sender);
    }

    /// @notice The administrator must establish the institution's real identity off-chain.
    function setIssuer(address issuer, string calldata name, bool approved) external onlyAdministrator {
        require(issuer != address(0) && didRegistered[issuer], "Register issuer DID first");
        require(bytes(name).length > 0 && bytes(name).length <= 120, "Invalid institution name");
        issuers[issuer] = Issuer(name, approved);
        emit IssuerUpdated(issuer, name, approved);
    }

    function issueCredential(bytes32 id, bytes32 digest, address student, uint64 expiresAt) external {
        require(issuers[msg.sender].approved, "Approved issuer only");
        require(didRegistered[student], "Register student DID first");
        require(id != bytes32(0) && digest != bytes32(0), "Empty identifier or digest");
        require(!credentials[id].exists, "Credential already exists");
        require(expiresAt > block.timestamp, "Expiration must be future");
        credentials[id] = Credential(digest, msg.sender, student, expiresAt, false, true);
        emit CredentialIssued(id, digest, msg.sender, student, expiresAt);
    }

    function revokeCredential(bytes32 id) external {
        Credential storage record = credentials[id];
        require(record.exists, "Unknown credential");
        require(record.issuer == msg.sender, "Issuing university only");
        require(!record.revoked, "Already revoked");
        record.revoked = true;
        emit CredentialRevoked(id, msg.sender);
    }

    /// @notice Registry validity. The backend separately checks the issuer signature.
    function verifyCredential(bytes32 id, bytes32 digest) external view returns (bool) {
        Credential storage record = credentials[id];
        return record.exists && record.digest == digest && !record.revoked
            && issuers[record.issuer].approved && record.expiresAt > block.timestamp;
    }
}
