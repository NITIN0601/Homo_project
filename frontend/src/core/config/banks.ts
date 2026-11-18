/**
 * ─── Indian Banking Providers (SSOT) ─────────────────────────────────────────
 * Comprehensive list of Reserve Bank of India (RBI) scheduled commercial banks,
 * public sector banks, private banks, and digital payment providers for Net Banking.
 */

export interface IndianBank {
  id: string;
  name: string;
  shortName: string;
  category: "popular" | "public" | "private" | "small_finance" | "payments";
  code: string;
}

export const INDIAN_BANKS: IndianBank[] = [
  // ── Popular / Top Banks ───────────────────────────────────────────────────
  { id: "sbi",       name: "State Bank of India (SBI)",           shortName: "SBI",       category: "popular", code: "SBIN" },
  { id: "hdfc",      name: "HDFC Bank",                          shortName: "HDFC",      category: "popular", code: "HDFC" },
  { id: "icici",     name: "ICICI Bank",                         shortName: "ICICI",     category: "popular", code: "ICIC" },
  { id: "axis",      name: "Axis Bank",                          shortName: "Axis",      category: "popular", code: "UTIB" },
  { id: "kotak",     name: "Kotak Mahindra Bank",                shortName: "Kotak",     category: "popular", code: "KKBK" },
  { id: "pnb",       name: "Punjab National Bank (PNB)",         shortName: "PNB",       category: "popular", code: "PUNB" },
  { id: "bob",       name: "Bank of Baroda",                     shortName: "BOB",       category: "popular", code: "BARB" },
  { id: "canara",    name: "Canara Bank",                        shortName: "Canara",    category: "popular", code: "CNRB" },

  // ── Public Sector Banks ───────────────────────────────────────────────────
  { id: "union",     name: "Union Bank of India",                shortName: "Union",     category: "public",  code: "UBIN" },
  { id: "boi",       name: "Bank of India",                      shortName: "BOI",       category: "public",  code: "BKID" },
  { id: "central",   name: "Central Bank of India",              shortName: "Central",   category: "public",  code: "CBIN" },
  { id: "indian",    name: "Indian Bank",                        shortName: "Indian",    category: "public",  code: "IDIB" },
  { id: "iob",       name: "Indian Overseas Bank",               shortName: "IOB",       category: "public",  code: "IOBA" },
  { id: "uco",       name: "UCO Bank",                           shortName: "UCO",       category: "public",  code: "UCBA" },
  { id: "psb",       name: "Punjab & Sind Bank",                 shortName: "PSB",       category: "public",  code: "PSIB" },
  { id: "bom",       name: "Bank of Maharashtra",                shortName: "BOM",       category: "public",  code: "MAHB" },

  // ── Private Sector Banks ──────────────────────────────────────────────────
  { id: "indusind",  name: "IndusInd Bank",                      shortName: "IndusInd",  category: "private", code: "INDB" },
  { id: "idfc",      name: "IDFC FIRST Bank",                    shortName: "IDFC",      category: "private", code: "IDFB" },
  { id: "yes",       name: "Yes Bank",                           shortName: "Yes",       category: "private", code: "YESB" },
  { id: "federal",   name: "Federal Bank",                       shortName: "Federal",   category: "private", code: "FDRL" },
  { id: "rbl",       name: "RBL Bank",                           shortName: "RBL",       category: "private", code: "RATN" },
  { id: "south_ind", name: "South Indian Bank",                  shortName: "SIB",       category: "private", code: "SIBL" },
  { id: "karur",     name: "Karur Vysya Bank",                   shortName: "KVB",       category: "private", code: "KVBL" },
  { id: "bandhan",   name: "Bandhan Bank",                       shortName: "Bandhan",   category: "private", code: "BDBL" },
  { id: "jk",        name: "Jammu & Kashmir Bank",               shortName: "J&K",       category: "private", code: "JAKA" },
  { id: "karnataka", name: "Karnataka Bank",                     shortName: "Karnataka", category: "private", code: "KARB" },
  { id: "city_union",name: "City Union Bank",                    shortName: "CUB",       category: "private", code: "CIUB" },
  { id: "tmb",       name: "Tamilnad Mercantile Bank",           shortName: "TMB",       category: "private", code: "TMBL" },
  { id: "csb",       name: "CSB Bank",                           shortName: "CSB",       category: "private", code: "CSBK" },
  { id: "dcb",       name: "DCB Bank",                           shortName: "DCB",       category: "private", code: "DCBL" },

  // ── Small Finance & Payments Banks ────────────────────────────────────────
  { id: "au_sf",     name: "AU Small Finance Bank",              shortName: "AU Bank",   category: "small_finance", code: "AUBL" },
  { id: "equitas",   name: "Equitas Small Finance Bank",         shortName: "Equitas",   category: "small_finance", code: "ESFB" },
  { id: "ujjivan",   name: "Ujjivan Small Finance Bank",         shortName: "Ujjivan",   category: "small_finance", code: "UJVN" },
  { id: "airtel",    name: "Airtel Payments Bank",               shortName: "Airtel",    category: "payments",      code: "AIRP" },
  { id: "paytm_pb",  name: "Paytm Payments Bank",                shortName: "Paytm PB",  category: "payments",      code: "PYTM" },
  { id: "ippb",      name: "India Post Payments Bank (IPPB)",    shortName: "IPPB",      category: "payments",      code: "IPOS" },
];
