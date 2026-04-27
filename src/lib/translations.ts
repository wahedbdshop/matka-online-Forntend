import type { AppLanguage } from "@/lib/language";

type TranslationDictionary = {
  common: {
    login: string;
    register: string;
    selectLanguage: string;
  };
  nav: {
    home: string;
    deposit: string;
    withdraw: string;
    transfer: string;
    games: string;
    profile: string;
  };
  profile: {
    accountBanned: string;
    contactSupport: string;
    nameLabel: string;
    usernameLabel: string;
    verified: string;
    unverified: string;
    balance: string;
    mainBalance: string;
    bonusBalance: string;
    referralCode: string;
    copy: string;
    copied: string;
    languageTitle: string;
    languageDescription: string;
    languageSaved: string;
    languageSaveFailed: string;
    editProfile: string;
    changePassword: string;
    notificationSettings: string;
    referralEarnings: string;
    bonusHistory: string;
    kycVerification: string;
    support: string;
    logout: string;
    logoutFailed: string;
    refreshBalance: string;
    notSet: string;
  };
};

export const translations: Record<AppLanguage, TranslationDictionary> = {
  en: {
    common: {
      login: "Log In",
      register: "Register",
      selectLanguage: "Select language",
    },
    nav: {
      home: "Home",
      deposit: "Deposit",
      withdraw: "Withdraw",
      transfer: "Transfer",
      games: "Games",
      profile: "Profile",
    },
    profile: {
      accountBanned: "Your account has been banned.",
      contactSupport: "Please contact support.",
      nameLabel: "Name",
      usernameLabel: "User Name",
      verified: "Verified",
      unverified: "Unverified",
      balance: "Balance",
      mainBalance: "Main Balance",
      bonusBalance: "Bonus Balance",
      referralCode: "Your Referral Code",
      copy: "Copy",
      copied: "Referral code copied!",
      languageTitle: "Language Preference",
      languageDescription: "Choose the language you want to use in the app.",
      languageSaved: "Language updated",
      languageSaveFailed:
        "Couldn't save language to your profile. Kept on this device.",
      editProfile: "Edit Profile",
      changePassword: "Change Password",
      notificationSettings: "Notification Settings",
      referralEarnings: "Referral & Earnings",
      bonusHistory: "Bonus History",
      kycVerification: "KYC Verification",
      support: "Support",
      logout: "Logout",
      logoutFailed: "Failed to log out",
      refreshBalance: "Refresh balance",
      notSet: "Not set",
    },
  },
  bn: {
    common: {
      login: "লগ ইন",
      register: "রেজিস্টার",
      selectLanguage: "ভাষা নির্বাচন করুন",
    },
    nav: {
      home: "হোম",
      deposit: "ডিপোজিট",
      withdraw: "উইথড্র",
      transfer: "ট্রান্সফার",
      games: "গেমস",
      profile: "প্রোফাইল",
    },
    profile: {
      accountBanned: "আপনার অ্যাকাউন্ট ব্যান করা হয়েছে।",
      contactSupport: "অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।",
      nameLabel: "নাম",
      usernameLabel: "ইউজার নেম",
      verified: "ভেরিফায়েড",
      unverified: "ভেরিফায়েড নয়",
      balance: "ব্যালেন্স",
      mainBalance: "মূল ব্যালেন্স",
      bonusBalance: "বোনাস ব্যালেন্স",
      referralCode: "আপনার রেফারেল কোড",
      copy: "কপি",
      copied: "রেফারেল কোড কপি হয়েছে!",
      languageTitle: "ভাষার পছন্দ",
      languageDescription: "অ্যাপে কোন ভাষা ব্যবহার করবেন তা বেছে নিন।",
      languageSaved: "ভাষা আপডেট হয়েছে",
      languageSaveFailed:
        "প্রোফাইলে ভাষা সেভ করা যায়নি। এই ডিভাইসে রাখা হয়েছে।",
      editProfile: "প্রোফাইল এডিট",
      changePassword: "পাসওয়ার্ড পরিবর্তন",
      notificationSettings: "নোটিফিকেশন সেটিংস",
      referralEarnings: "রেফারেল ও আয়",
      bonusHistory: "বোনাস হিস্টোরি",
      kycVerification: "কেওয়াইসি ভেরিফিকেশন",
      support: "সাপোর্ট",
      logout: "লগ আউট",
      logoutFailed: "লগ আউট করা যায়নি",
      refreshBalance: "ব্যালেন্স রিফ্রেশ করুন",
      notSet: "সেট করা হয়নি",
    },
  },
  hi: {
    common: {
      login: "लॉग इन",
      register: "रजिस्टर",
      selectLanguage: "भाषा चुनें",
    },
    nav: {
      home: "होम",
      deposit: "डिपॉजिट",
      withdraw: "निकासी",
      transfer: "ट्रांसफर",
      games: "गेम्स",
      profile: "प्रोफाइल",
    },
    profile: {
      accountBanned: "आपका अकाउंट बैन कर दिया गया है।",
      contactSupport: "कृपया सपोर्ट से संपर्क करें।",
      nameLabel: "नाम",
      usernameLabel: "यूज़र नेम",
      verified: "वेरिफाइड",
      unverified: "वेरिफाइड नहीं",
      balance: "बैलेंस",
      mainBalance: "मुख्य बैलेंस",
      bonusBalance: "बोनस बैलेंस",
      referralCode: "आपका रेफरल कोड",
      copy: "कॉपी",
      copied: "रेफरल कोड कॉपी हो गया!",
      languageTitle: "भाषा पसंद",
      languageDescription: "ऐप में कौन सी भाषा चाहिए, वह चुनें।",
      languageSaved: "भाषा अपडेट हो गई",
      languageSaveFailed:
        "प्रोफाइल में भाषा सेव नहीं हुई। इस डिवाइस पर रखी गई है।",
      editProfile: "प्रोफाइल एडिट",
      changePassword: "पासवर्ड बदलें",
      notificationSettings: "नोटिफिकेशन सेटिंग्स",
      referralEarnings: "रेफरल और कमाई",
      bonusHistory: "बोनस हिस्ट्री",
      kycVerification: "KYC वेरिफिकेशन",
      support: "सपोर्ट",
      logout: "लॉग आउट",
      logoutFailed: "लॉग आउट नहीं हो सका",
      refreshBalance: "बैलेंस रीफ्रेश करें",
      notSet: "सेट नहीं है",
    },
  },
};
