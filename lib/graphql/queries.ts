import { gql } from "@apollo/client";

// ─── Dashboard ───
export const GET_DASHBOARD = gql`
  query GetDashboard($date: String) {
    getDashboard(date: $date) {
      today {
        date
        totalSales
        totalProfit
        totalExpenses
        netProfit
        invoiceCount
        itemsSold
      }
      month {
        date
        totalSales
        totalProfit
        totalExpenses
        netProfit
        invoiceCount
      }
      topProducts {
        productId
        productName
        sku
        totalQuantitySold
        totalRevenue
        totalProfit
      }
      lowStockCount
      pendingInvoices
    }
  }
`;

// ─── Products ───
export const LIST_PRODUCTS = gql`
  query ListProducts($search: String) {
    listProducts(search: $search) {
      items {
        productId
        name
        sku
        hsnCode
        costPrice
        sellingPrice
        gstRate
        category
        unit
        lowStockAlert
        marginPercent
        gstAmount
        sellingPriceWithGst
        currentStock
        createdAt
      }
      total
    }
  }
`;


export const GET_PRODUCT = gql`
  query GetProduct($productId: String!) {
    getProduct(productId: $productId) {
      productId
      name
      sku
      costPrice
      sellingPrice
      gstRate
      category
      unit
      lowStockAlert
      marginPercent
      sellingPriceWithGst
    }
  }
`;

// ─── Invoices ───
export const LIST_INVOICES = gql`
  query ListInvoices($dateFrom: String, $limit: Int) {
    listInvoices(dateFrom: $dateFrom, limit: $limit) {
      items {
        saleId
        invoiceNumber
        customerName
        customerPhone
        subtotal
        totalGst
        discountAmount
        totalAmount
        totalProfit
        paymentMethod
        pdfUrl
        createdAt
        items {
          productName
          sku
          quantity
          unit
          sellingPrice
          gstRate
          gstAmount
          lineTotal
          profit
        }
      }
      total
    }
  }
`;

export const GET_INVOICE = gql`
  query GetInvoice($saleId: String!) {
    getInvoice(saleId: $saleId) {
      saleId
      invoiceNumber
      customerName
      customerPhone
      customerGstin
      items {
        productId
        productName
        sku
        quantity
        unit
        costPrice
        sellingPrice
        gstRate
        gstAmount
        profit
        lineTotal
        lineTotalWithGst
      }
      subtotal
      totalGst
      discountAmount
      totalAmount
      amountPaid
      balanceDue
      totalCost
      totalProfit
      paymentMethod
      pdfUrl
      notes
      createdAt
      businessName
      businessGstin
      businessAddress
      businessPhone
      businessCity
      businessState
      returns {
        returnId
        creditNoteNumber
        totalAmount
        createdAt
        reason
      }
    }
  }
`;

export const GET_INVOICE_DOWNLOAD_URL = gql`
  query GetInvoiceDownloadUrl($saleId: String!) {
    getInvoiceDownloadUrl(saleId: $saleId)
  }
`;

export const SEARCH_INVOICES = gql`
  query SearchInvoices($query: String!, $limit: Int) {
    searchInvoices(query: $query, limit: $limit) {
      items {
        saleId
        invoiceNumber
        customerName
        customerPhone
        totalAmount
        createdAt
      }
    }
  }
`;

// ─── Stock ───
export const GET_STOCK_LEVELS = gql`
  query GetStockLevels($search: String) {
    getStockLevels(search: $search) {
      productId
      productName
      sku
      totalIn
      totalOut
      currentStock
      lowStockAlert
      isLowStock
    }
  }
`;

// ─── Expenses ───
export const LIST_EXPENSES = gql`
  query ListExpenses($month: String!) {
    listExpenses(month: $month) {
      items {
        expenseId
        amount
        category
        description
        date
        paymentMethod
        createdAt
      }
      totalAmount
      byCategory {
        category
        total
        count
      }
    }
  }
`;

// ─── Reports ───
export const GET_PROFIT_REPORT = gql`
  query GetProfitReport($dateFrom: String!, $dateTo: String!) {
    getProfitReport(dateFrom: $dateFrom, dateTo: $dateTo) {
      dateFrom
      dateTo
      grossProfit
      totalExpenses
      netProfit
      totalRevenue
      totalCost
      invoiceCount
      profitMarginPercent
      dailyBreakdown {
        date
        totalSales
        totalProfit
        totalExpenses
        netProfit
        invoiceCount
      }
    }
  }
`;

export const GET_GSTR1_REPORT = gql`
  query GetGstr1Report($dateFrom: String!, $dateTo: String!) {
    getGstr1Report(dateFrom: $dateFrom, dateTo: $dateTo) {
      dateFrom
      dateTo
      totalTaxableValue
      totalGstAmount
      totalInvoiceValue
      b2bB2c {
        b2bTaxableValue
        b2bGstAmount
        b2bTotalValue
        b2cTaxableValue
        b2cGstAmount
        b2cTotalValue
      }
      hsnSummary {
        hsnCode
        totalQuantity
        totalTaxableValue
        totalGstAmount
        totalValue
      }
      taxSlabSummary {
        gstRate
        totalTaxableValue
        totalGstAmount
        totalValue
      }
    }
  }
`;

// ─── Customers / Ledger ───
export const LIST_CUSTOMERS = gql`
  query ListCustomers($search: String) {
    listCustomers(search: $search) {
      items {
        customerId
        name
        phone
        gstin
        totalInvoiced
        totalPaid
        advance
        totalReturned
        outstanding
        invoiceCount
        lastInvoiceDate
      }
      total
    }
  }
`;

export const GET_CUSTOMER_LEDGER = gql`
  query GetCustomerLedger($phone: String!) {
    getCustomerLedger(phone: $phone) {
      customer {
        customerId
        name
        phone
        gstin
        totalInvoiced
        totalPaid
        advance
        totalReturned
        outstanding
        invoiceCount
        lastInvoiceDate
      }
      entries {
        entryId
        entryType
        amount
        amountPaid
        balanceAfter
        description
        date
        createdAt
        saleId
        pdfUrl
        creditNote
        refundType
        returnId
      }
    }
  }
`;

export const GET_CUSTOMER_BY_PHONE = gql`
  query GetCustomerByPhone($phone: String!) {
    getCustomerByPhone(phone: $phone) {
      customerId
      name
      phone
      gstin
      outstanding
      totalInvoiced
      totalPaid
      invoiceCount
    }
  }
`;

// ─── Tenant Settings ───
export const GET_TENANT_PROFILE = gql`
  query GetTenantProfile {
    getTenantProfile {
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
      plan
      subStatus
      razorpaySubId
      trialEndsAt
      currentPeriodEnd
      createdAt
    }
  }
`;

export const LIST_USERS = gql`
  query ListUsers {
    listUsers {
      userId
      name
      email
      role
      isActive
      createdAt
    }
  }
`;

// ─── Product Import (status polling — read-only query) ───
export const GET_IMPORT_JOB_STATUS = gql`
  query GetImportJobStatus($importJobId: String!) {
    getImportJobStatus(importJobId: $importJobId) {
      importJobId
      status
      totalRows
      imported
      skipped
      errors {
        row
        name
        reason
      }
      errorMsg
      startedAt
      completedAt
    }
  }
`;

// ─── Returns / Credit Notes ───
export const LIST_RETURNS = gql`
  query ListReturns($limit: Int) {
    listReturns(limit: $limit) {
      items {
        returnId
        creditNoteNumber
        originalInvoiceId
        originalInvoiceNumber
        customerName
        customerPhone
        items {
          productId
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
        pdfStatus
        businessName
        businessGstin
        businessAddress
        businessPhone
      }
      total
    }
  }
`;

export const GET_RETURN = gql`
  query GetReturn($returnId: String!) {
    getReturn(returnId: $returnId) {
      returnId
      creditNoteNumber
      originalInvoiceId
      originalInvoiceNumber
      customerName
      customerPhone
      items {
        productId
        productName
        sku
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
      businessName
      businessGstin
      businessAddress
      businessPhone
      pdfStatus
    }
  }
`;

export const GET_RETURN_DOWNLOAD_URL = gql`
  query GetReturnDownloadUrl($returnId: String!) {
    getReturnDownloadUrl(returnId: $returnId)
  }
`;
