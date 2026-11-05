/** «2027-06-12» → «12.06.2027» */
export const fmtDate = (date: string) => date.split("-").reverse().join(".");
