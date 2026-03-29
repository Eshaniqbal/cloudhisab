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
      message
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
      expiresIn
      challengeName
      session
      tenant {
        tenantId
        businessName
        ownerName
      }
    }
  }
`;

export const RESPOND_TO_NEW_PASSWORD_CHALLENGE = gql`
  mutation RespondToNewPasswordChallenge($email: String!, $session: String!, $newPassword: String!) {
    respondToNewPasswordChallenge(email: $email, session: $session, newPassword: $newPassword) {
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
      hsnCode
      costPrice
      sellingPrice
      gstRate
      category
      unit
      marginPercent
      sellingPriceWithGst
      currentStock
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
      hsnCode
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

export const DELETE_INVOICE = gql`
  mutation DeleteInvoice($saleId: String!) {
    deleteInvoice(saleId: $saleId)
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

export const ADJUST_STOCK = gql`
  mutation AdjustStock($input: StockAdjustmentInput!) {
    adjustStock(input: $input) {
      productId
      productName
      entryType
      quantity
      newStock
      notes
      createdAt
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

// ─── Tenant Settings ───
export const UPDATE_TENANT_PROFILE = gql`
  mutation UpdateTenantProfile($input: UpdateTenantInput!) {
    updateTenantProfile(input: $input) {
      tenantId
      businessName
      ownerName
      email
      phone
      gstin
      address
      city
      state
      pincode
      showGstOnInvoice
      plan
    }
  }
`;

// ─── Password Reset ───
export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

export const CONFIRM_FORGOT_PASSWORD = gql`
  mutation ConfirmForgotPassword($email: String!, $code: String!, $newPassword: String!) {
    confirmForgotPassword(email: $email, code: $code, newPassword: $newPassword)
  }
`;

// ─── User / Team Management ───
export const INVITE_USER = gql`
  mutation InviteUser($input: InviteUserInput!) {
    inviteUser(input: $input) {
      userId
      name
      email
      role
      isActive
      createdAt
    }
  }
`;

export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($input: UpdateUserRoleInput!) {
    updateUserRole(input: $input) {
      userId
      name
      email
      role
      isActive
      createdAt
    }
  }
`;

export const TOGGLE_USER_ACTIVE = gql`
  mutation ToggleUserActive($userId: String!, $active: Boolean!) {
    toggleUserActive(userId: $userId, active: $active) {
      userId
      name
      email
      role
      isActive
      createdAt
    }
  }
`;

export const REMOVE_USER = gql`
  mutation RemoveUser($userId: String!) {
    removeUser(userId: $userId)
  }
`;

// ─── Product Import ───
export const CREATE_PRODUCT_IMPORT_URL = gql`
  mutation CreateProductImportUrl($fileName: String!, $onDuplicate: String) {
    createProductImportUrl(fileName: $fileName, onDuplicate: $onDuplicate) {
      uploadUrl
      importJobId
      s3Key
    }
  }
`;

// Called AFTER the S3 PUT upload succeeds — triggers the Lambda via SQS
export const NOTIFY_IMPORT_UPLOADED = gql`
  mutation NotifyImportUploaded($importJobId: String!) {
    notifyImportUploaded(importJobId: $importJobId)
  }
`;

// ─── Returns / Credit Notes ───
export const CREATE_RETURN = gql`
  mutation CreateReturn($input: CreateReturnInput!) {
    createReturn(input: $input) {
      returnId
      creditNoteNumber
      originalInvoiceId
      originalInvoiceNumber
      customerName
      customerPhone
      items {
        productName
        quantity
        sellingPrice
        gstRate
        gstAmount
        lineTotal
        lineTotalWithGst
      }
      subtotal
      totalGst
      totalAmount
      reason
      refundType
      restock
      notes
      createdAt
    }
  }
`;
