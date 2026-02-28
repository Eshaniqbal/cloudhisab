import { gql } from "@apollo/client";

// ─── Auth ───
export const REGISTER_TENANT = gql`
  mutation RegisterTenant($input: TenantInput!) {
    registerTenant(input: $input) {
      tenantId
      userId
      email
      message
    }
  }
`;

export const VERIFY_OTP = gql`
  mutation VerifyOtp($input: VerifyOtpInput!) {
    verifyOtp(input: $input) {
      tenantId
      userId
      email
      role
      accessToken
      refreshToken
      expiresIn
      tenant {
        tenantId
        businessName
        ownerName
        plan
      }
    }
  }
`;

export const RESEND_OTP = gql`
  mutation ResendOtp($email: String!) {
    resendOtp(email: $email)
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      tenantId
      userId
      email
      role
      accessToken
      refreshToken
      tenant {
        tenantId
        businessName
        ownerName
      }
    }
  }
`;

// ─── Products ───
export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) {
      productId
      name
      sku
      costPrice
      sellingPrice
      gstRate
      category
      unit
      marginPercent
      sellingPriceWithGst
      createdAt
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($productId: String!, $input: ProductInput!) {
    updateProduct(productId: $productId, input: $input) {
      productId
      name
      sku
      costPrice
      sellingPrice
      gstRate
      category
      unit
      marginPercent
    }
  }
`;

export const DELETE_PRODUCT = gql`
  mutation DeleteProduct($productId: String!) {
    deleteProduct(productId: $productId)
  }
`;

// ─── Billing (Core!) ───
export const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: InvoiceInput!) {
    createInvoice(input: $input) {
      saleId
      invoiceNumber
      totalAmount
      totalProfit
      totalGst
      amountPaid
      balanceDue
      pdfUrl
      createdAt
    }
  }
`;

// ─── Stock / Purchases ───
export const RECORD_PURCHASE = gql`
  mutation RecordPurchase($input: PurchaseInput!) {
    recordPurchase(input: $input) {
      purchaseId
      supplierName
      totalAmount
      createdAt
      items {
        productName
        quantity
        costPrice
        lineTotal
      }
    }
  }
`;

// ─── Expenses ───
export const ADD_EXPENSE = gql`
  mutation AddExpense($input: ExpenseInput!) {
    addExpense(input: $input) {
      expenseId
      amount
      category
      description
      date
      paymentMethod
      createdAt
    }
  }
`;

// ─── Customers / Ledger ───
export const RECORD_CUSTOMER_PAYMENT = gql`
  mutation RecordCustomerPayment($input: RecordPaymentInput!) {
    recordCustomerPayment(input: $input) {
      customerId
      name
      phone
      totalInvoiced
      totalPaid
      advance
      outstanding
    }
  }
`;

export const RECORD_ADVANCE = gql`
  mutation RecordAdvance($input: RecordAdvanceInput!) {
    recordAdvance(input: $input) {
      customerId
      name
      phone
      totalInvoiced
      totalPaid
      advance
      outstanding
    }
  }
`;

export const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($phone: String!) {
    deleteCustomer(phone: $phone)
  }
`;

export const DELETE_EXPENSE = gql`
  mutation DeleteExpense($expenseId: String!) {
    deleteExpense(expenseId: $expenseId)
  }
`;
