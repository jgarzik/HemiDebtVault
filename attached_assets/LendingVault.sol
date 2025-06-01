// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EnhancedLendingVault
 * @dev A decentralized peer-to-peer lending protocol where loans are represented as tradeable NFTs.
 * 
 * CORE FEATURES:
 * • Credit Lines: Lenders configure personalized borrowing limits and APR ranges per borrower/token
 * • NFT-Based Loans: Each loan is an ERC721 token that can be traded on secondary markets
 * • Dynamic Interest Rates: APR varies with utilization (linear interpolation between min/max rates)
 * • Simple Interest Model: Interest accrues linearly based on time elapsed since last payment
 * • Flexible Repayment: No maturity dates or liquidations - borrowers control repayment timing
 * • Dual Identity System: Original borrower remains tied to credit utilization, current NFT owner handles repayment
 * • Lender Tools: Principal forgiveness, interest forgiveness, and deposit management
 * • Anti-Spam Protection: Global loan count limits prevent DoS attacks
 * 
 * ECONOMIC MODEL:
 * • Interest = (outstanding_principal × APR × elapsed_days) ÷ (365 × 10000)
 * • APR Range: 0.01% to 100% annually (1-10000 basis points)
 * • Utilization-Based Pricing: Higher borrowing utilization = higher interest rates
 * • No Platform Fees: Pure peer-to-peer lending without protocol revenue
 * 
 * SECURITY FEATURES:
 * • Reentrancy Protection: All external calls use CEI pattern with nonReentrant guards
 * • Overflow Protection: Safe arithmetic for all interest calculations
 * • Credit Isolation: Each lender/borrower/token combination has independent credit terms
 * • Transfer Safety: NFT transfers cannot manipulate credit utilization or bypass loan limits
 * 
 * SUPPORTED TOKENS:
 * • Standard ERC20 tokens only (no fee-on-transfer or rebasing tokens)
 * • Decimal agnostic: Works with any ERC20 decimal configuration
 * • Token-specific credit lines: Each ERC20 has separate borrowing terms
 */

import "@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";

contract EnhancedLendingVault is ERC721, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Custom errors for gas efficiency
    error InsufficientBalance();
    error UnauthorizedBorrower();
    error InvalidAmount();
    error InvalidAPRRange();
    error ExceedsCreditLimit();
    error InsufficientLenderBalance();
    error LoanClosedError();
    error NotLoanOwner();
    error APRTooHigh();
    error InvalidAddress();
    error NotLender();
    error InvalidAPR();
    error ExceedsOutstanding();
    error TooManyLoans();
    error NonexistentToken();

    // Protocol constants
    uint256 private constant MAX_APR = 10000; // Maximum 100.00% annual rate
    uint256 private constant MIN_APR = 1; // Minimum 0.01% annual rate  
    uint256 private constant PRECISION_FACTOR = 1e18; // Calculation precision
    uint256 private constant DAYS_IN_YEAR = 365; // Interest calculation basis
    uint256 private constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public constant MAX_LOANS_PER_USER = 50; // DoS protection limit

    /// @notice Credit line configuration from lender to borrower for specific token
    struct CreditConfig {
        uint256 creditLimit;     // Maximum principal borrower can owe to this lender
        uint256 minAPR;          // APR at 0% utilization (basis points)
        uint256 maxAPR;          // APR at 100% utilization (basis points)
    }

    /// @notice Complete loan data stored for each NFT
    struct LoanNFT {
        address borrower;        // Current NFT owner (responsible for repayment)
        address lender;          // Lender who provided the funds
        address token;           // ERC20 token borrowed
        uint256 principal;       // Original amount borrowed
        uint256 repaidPrincipal; // Cumulative principal payments made
        uint256 forgivenPrincipal; // Principal amount forgiven by lender
        uint256 apr;             // Fixed annual percentage rate (basis points)
        uint64 startTimestamp;   // Loan creation timestamp
        uint64 lastPaymentTimestamp; // Most recent payment timestamp
        bool closed;             // True when loan is fully satisfied
    }

    // Global state
    uint256 private _loanIdCounter;

    // Core protocol mappings
    mapping(address => mapping(address => mapping(address => CreditConfig))) public creditLines;
    mapping(address => mapping(address => uint256)) public lenderDeposits;
    mapping(uint256 => LoanNFT) public loanById;
    mapping(address => uint256) public userLoanCount;
    mapping(address => uint256) public totalUserLoans;
    mapping(uint256 => address) public originalBorrower;
    
    // Events
    event Deposited(address indexed lender, address indexed token, uint256 amount);
    event Withdrawn(address indexed lender, address indexed token, uint256 amount);
    event CreditLineUpdated(
        address indexed lender,
        address indexed borrower,
        address indexed token,
        uint256 creditLimit,
        uint256 minAPR,
        uint256 maxAPR
    );
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        address token,
        uint256 amount,
        uint256 apr
    );
    event LoanRepaid(
        uint256 indexed loanId,
        uint256 amount,
        uint256 interestPaid,
        uint256 principalPaid
    );
    event LoanClosed(uint256 indexed loanId);
    event PrincipalForgiven(uint256 indexed loanId, uint256 amount);
    event InterestForgiven(uint256 indexed loanId);
    event APRCalculated(uint256 indexed loanId, uint256 utilization, uint256 apr);
    event CreditUtilizationUpdated(
        address indexed borrower,
        address indexed lender,
        address indexed token,
        uint256 newUtilization
    );

    constructor() ERC721("EnhancedLoanNFT", "ELNFT") {}

    /// @notice Deposit tokens to enable lending
    /// @param token ERC20 token address to deposit
    /// @param amount Number of tokens to deposit
    function deposit(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (token == address(0)) revert InvalidAddress();
        
        // Update balances before external call
        lenderDeposits[msg.sender][token] += amount;
        
        // Transfer tokens from depositor
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, token, amount);
    }

    /// @notice Withdraw available tokens from deposits
    /// @param token ERC20 token address to withdraw  
    /// @param amount Number of tokens to withdraw
    function withdraw(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (lenderDeposits[msg.sender][token] < amount) revert InsufficientBalance();
        
        lenderDeposits[msg.sender][token] -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    /// @notice Configure credit line terms for a borrower
    /// @param borrower Address authorized to borrow
    /// @param token ERC20 token for this credit line
    /// @param creditLimit Maximum principal borrower can owe
    /// @param minAPR Interest rate at 0% utilization (basis points)
    /// @param maxAPR Interest rate at 100% utilization (basis points)
    function updateCreditLine(
        address borrower,
        address token,
        uint256 creditLimit,
        uint256 minAPR,
        uint256 maxAPR
    ) external {
        if (borrower == address(0) || token == address(0)) revert InvalidAddress();
        if (minAPR > maxAPR) revert InvalidAPRRange();
        if (maxAPR > MAX_APR) revert APRTooHigh();
        if (minAPR < MIN_APR) revert InvalidAPR();
        if (creditLimit > 0 && minAPR == 0 && maxAPR == 0) revert InvalidAPRRange();
        
        creditLines[msg.sender][borrower][token] = CreditConfig({
            creditLimit: creditLimit,
            minAPR: minAPR,
            maxAPR: maxAPR
        });
        
        emit CreditLineUpdated(msg.sender, borrower, token, creditLimit, minAPR, maxAPR);
    }

    /// @notice Borrow tokens against a credit line and mint loan NFT
    /// @param lender Address to borrow from
    /// @param token ERC20 token to borrow
    /// @param amount Number of tokens to borrow
    /// @return loanId Unique identifier for the new loan NFT
    function borrow(
        address lender,
        address token,
        uint256 amount
    ) external nonReentrant returns (uint256 loanId) {
        if (amount == 0) revert InvalidAmount();
        if (userLoanCount[msg.sender] >= MAX_LOANS_PER_USER) revert TooManyLoans();
        if (totalUserLoans[msg.sender] >= MAX_LOANS_PER_USER) revert TooManyLoans();
        
        CreditConfig memory config = creditLines[lender][msg.sender][token];
        if (config.creditLimit == 0) revert UnauthorizedBorrower();
        
        // Verify credit capacity and liquidity
        uint256 currentBorrowing = _getCurrentBorrowing(msg.sender, lender, token);
        if (currentBorrowing + amount > config.creditLimit) revert ExceedsCreditLimit();
        if (lenderDeposits[lender][token] < amount) revert InsufficientLenderBalance();
        
        // Calculate interest rate based on utilization
        uint256 utilization = (currentBorrowing * PRECISION_FACTOR) / config.creditLimit;
        uint256 apr = config.minAPR + ((utilization * (config.maxAPR - config.minAPR)) / PRECISION_FACTOR);
        
        // Create and configure loan NFT
        loanId = _loanIdCounter++;
        _safeMint(msg.sender, loanId);
        originalBorrower[loanId] = msg.sender;
        
        uint64 currentTime = uint64(block.timestamp);
        loanById[loanId] = LoanNFT({
            borrower: msg.sender,
            lender: lender,
            token: token,
            principal: amount,
            repaidPrincipal: 0,
            forgivenPrincipal: 0,
            apr: apr,
            startTimestamp: currentTime,
            lastPaymentTimestamp: currentTime,
            closed: false
        });
        
        // Update accounting and transfer tokens
        lenderDeposits[lender][token] -= amount;
        userLoanCount[msg.sender]++;
        totalUserLoans[msg.sender]++;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        // Emit comprehensive event data
        emit LoanCreated(loanId, msg.sender, lender, token, amount, apr);
        emit APRCalculated(loanId, utilization, apr);
        emit CreditUtilizationUpdated(msg.sender, lender, token, currentBorrowing + amount);
    }

    /// @notice Repay loan debt (interest paid first, then principal)
    /// @param loanId NFT token ID of the loan to repay
    /// @param amount Total repayment amount
    function repay(uint256 loanId, uint256 amount) external nonReentrant {
        if (ownerOf(loanId) != msg.sender) revert NotLoanOwner();
        if (amount == 0) revert InvalidAmount();
        
        LoanNFT storage loan = loanById[loanId];
        if (loan.closed) revert LoanClosedError();
        
        // Calculate debt at fixed point in time
        uint256 outstandingPrincipal = _getOutstandingPrincipal(loan);
        uint256 interest = _calculateInterest(loan);
        
        // Lock in payment timestamp to prevent manipulation
        loan.lastPaymentTimestamp = uint64(block.timestamp);
        
        // Allocate payment between interest and principal
        uint256 remaining = amount;
        uint256 interestPaid = 0;
        uint256 principalPaid = 0;
        
        if (interest > 0 && remaining > 0) {
            interestPaid = interest <= remaining ? interest : remaining;
            remaining -= interestPaid;
        }
        
        if (remaining > 0 && outstandingPrincipal > 0) {
            principalPaid = remaining <= outstandingPrincipal ? remaining : outstandingPrincipal;
            loan.repaidPrincipal += principalPaid;
        }
        
        // Update pool accounting
        lenderDeposits[loan.lender][loan.token] += (principalPaid + interestPaid);
        
        // Transfer payment tokens
        IERC20(loan.token).safeTransferFrom(msg.sender, address(this), amount);
        
        _tryCloseLoan(loanId);
        
        // Emit detailed repayment and utilization data
        uint256 newUtilization = _getCurrentBorrowing(originalBorrower[loanId], loan.lender, loan.token);
        emit CreditUtilizationUpdated(originalBorrower[loanId], loan.lender, loan.token, newUtilization);
        emit LoanRepaid(loanId, amount, interestPaid, principalPaid);
    }

    /// @notice Lender forgives outstanding principal (absorbs loss)
    /// @param loanId NFT token ID of the loan
    /// @param amount Principal amount to forgive
    function forgivePrincipal(uint256 loanId, uint256 amount) external {
        LoanNFT storage loan = loanById[loanId];
        if (msg.sender != loan.lender) revert NotLender();
        if (loan.closed) revert LoanClosedError();
        if (amount == 0) revert InvalidAmount();
        
        uint256 outstandingPrincipal = _getOutstandingPrincipal(loan);
        if (amount > outstandingPrincipal) revert ExceedsOutstanding();
        if (lenderDeposits[loan.lender][loan.token] < amount) revert InsufficientBalance();
        
        // Record forgiveness and absorb loss from lender deposits
        loan.forgivenPrincipal += amount;
        lenderDeposits[loan.lender][loan.token] -= amount;
        
        emit PrincipalForgiven(loanId, amount);
        
        uint256 newUtilization = _getCurrentBorrowing(originalBorrower[loanId], loan.lender, loan.token);
        emit CreditUtilizationUpdated(originalBorrower[loanId], loan.lender, loan.token, newUtilization);
        
        _tryCloseLoan(loanId);
    }

    /// @notice Lender forgives all accrued interest
    /// @param loanId NFT token ID of the loan
    function forgiveInterest(uint256 loanId) external {
        LoanNFT storage loan = loanById[loanId];
        if (msg.sender != loan.lender) revert NotLender();
        if (loan.closed) revert LoanClosedError();
        
        // Reset interest calculation by updating payment timestamp
        loan.lastPaymentTimestamp = uint64(block.timestamp);
        emit InterestForgiven(loanId);
    }

    /// @notice Handle NFT transfers and update loan ownership
    /// @dev Transfers repayment responsibility but preserves credit attribution
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        
        // Update loan counts for active loans during transfers
        if (from != address(0) && to != address(0)) {
            LoanNFT storage loan = loanById[tokenId];
            if (!loan.closed) {
                userLoanCount[from]--;
                userLoanCount[to]++;
                loan.borrower = to;
            }
        }
        
        return from;
    }

    /// @notice Get outstanding principal amount for a loan
    /// @param loan Loan data struct
    /// @return Outstanding principal (original - repaid - forgiven)
    function _getOutstandingPrincipal(LoanNFT memory loan) internal pure returns (uint256) {
        return loan.principal - loan.repaidPrincipal - loan.forgivenPrincipal;
    }

    /// @notice Get days elapsed since last payment
    /// @param loan Loan data struct  
    /// @return Number of full days since last payment
    function _getElapsedDays(LoanNFT memory loan) internal view returns (uint256) {
        return (block.timestamp - loan.lastPaymentTimestamp) / 1 days;
    }

    /// @notice Calculate simple interest accrued on a loan
    /// @param loan Loan data struct
    /// @return interest Accrued interest amount with overflow protection
    function _calculateInterest(LoanNFT memory loan) internal view returns (uint256 interest) {
        if (loan.closed || loan.apr == 0) return 0;
        
        uint256 outstanding = _getOutstandingPrincipal(loan);
        uint256 elapsedDays = _getElapsedDays(loan);
        
        if (outstanding == 0 || elapsedDays == 0) return 0;
        
        // Prevent overflow in multiplication: interest = principal × rate × time
        uint256 maxPrincipal = type(uint256).max / loan.apr / elapsedDays;
        if (outstanding <= maxPrincipal) {
            interest = (outstanding * loan.apr * elapsedDays) / (DAYS_IN_YEAR * BASIS_POINTS);
        } else {
            // Alternative calculation to avoid overflow
            uint256 dailyRate = (outstanding * loan.apr) / (DAYS_IN_YEAR * BASIS_POINTS);
            interest = dailyRate * elapsedDays;
        }
    }

    /// @notice Close loan if fully satisfied and burn NFT
    /// @param loanId NFT token ID to potentially close
    function _tryCloseLoan(uint256 loanId) internal {
        LoanNFT storage loan = loanById[loanId];
        if (loan.repaidPrincipal + loan.forgivenPrincipal >= loan.principal) {
            loan.closed = true;
            userLoanCount[loan.borrower]--;
            _burn(loanId);
            emit LoanClosed(loanId);
        }
    }

    /// @notice Get current principal borrowed by user from lender for token
    /// @param borrower Original borrower address (not current NFT owner)
    /// @param lender Lender address
    /// @param token ERC20 token address
    /// @return total Outstanding principal across all matching loans
    function _getCurrentBorrowing(address borrower, address lender, address token) internal view returns (uint256 total) {
        for (uint256 i = 0; i < _loanIdCounter; i++) {
            try this.ownerOf(i) returns (address) {
                LoanNFT memory loan = loanById[i];
                if (originalBorrower[i] == borrower && loan.lender == lender && loan.token == token && !loan.closed) {
                    total += _getOutstandingPrincipal(loan);
                }
            } catch {}
        }
    }

    /// @notice Get detailed loan financial information
    /// @param loanId NFT token ID
    /// @return principal Outstanding principal amount
    /// @return interest Currently accrued interest
    function getOutstandingBalance(uint256 loanId) external view returns (uint256 principal, uint256 interest) {
        LoanNFT memory loan = loanById[loanId];
        principal = _getOutstandingPrincipal(loan);
        interest = _calculateInterest(loan);
    }

    /// @notice Get available borrowing capacity for user
    /// @param borrower Original borrower address
    /// @param lender Lender address  
    /// @param token ERC20 token address
    /// @return availableCredit Remaining credit capacity
    function getAvailableCredit(
        address borrower,
        address lender,
        address token
    ) external view returns (uint256 availableCredit) {
        CreditConfig memory config = creditLines[lender][borrower][token];
        uint256 borrowed = _getCurrentBorrowing(borrower, lender, token);
        availableCredit = config.creditLimit > borrowed ? config.creditLimit - borrowed : 0;
    }

    /// @notice Check if NFT token exists
    /// @param tokenId Token ID to check
    /// @return exists True if token has been minted and not burned
    function _exists(uint256 tokenId) internal view returns (bool) {
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }
}