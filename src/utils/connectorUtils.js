export const ConnectorIcons = {
    'CCS 2': require('../assets/icons/ic_chargers/ccs_combo_2.png'),
    'CCS2': require('../assets/icons/ic_chargers/ccs_combo_2.png'),
    'CCS 1': require('../assets/icons/ic_chargers/ccs_combo_1.png'),
    'CCS1': require('../assets/icons/ic_chargers/ccs_combo_1.png'),
    'Type 2': require('../assets/icons/ic_chargers/type_2.png'),
    'Type2': require('../assets/icons/ic_chargers/type_2.png'),
    'Type 1': require('../assets/icons/ic_chargers/type_1.png'),
    'Type1': require('../assets/icons/ic_chargers/type_1.png'),
    'CHAdeMO': require('../assets/icons/ic_chargers/chademo.png'),
    'GB/T': require('../assets/icons/ic_chargers/gb_t.png'),
    'GBT': require('../assets/icons/ic_chargers/gb_t.png'),
    'AC': require('../assets/icons/ic_chargers/ac_dc.png'), // Fallback for Generic AC
    'DC': require('../assets/icons/ic_chargers/ac_dc.png'), // Fallback for Generic DC
    'Default': require('../assets/icons/ic_chargers/ac_dc.png'), // Fallback
};

export const getConnectorIcon = (type) => {
    if (!type) return ConnectorIcons['Default'];

    // Normalize string
    const normalized = type.toString().trim();

    // Direct Match
    if (ConnectorIcons[normalized]) return ConnectorIcons[normalized];

    // Fuzzy Match
    const upper = normalized.toUpperCase();
    if (upper.includes('CCS') && upper.includes('2')) return ConnectorIcons['CCS 2'];
    if (upper.includes('CCS') && upper.includes('1')) return ConnectorIcons['CCS 1'];
    if (upper.includes('TYPE') && upper.includes('2')) return ConnectorIcons['Type 2'];
    if (upper.includes('TYPE') && upper.includes('1')) return ConnectorIcons['Type 1'];
    if (upper.includes('CHADEMO')) return ConnectorIcons['CHAdeMO'];
    if (upper.includes('GB')) return ConnectorIcons['GB/T'];

    return ConnectorIcons['Default'];
};
