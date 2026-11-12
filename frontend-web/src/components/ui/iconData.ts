export interface IconDefinition {
  width: number;
  height: number;
  xml: string;
}

export const iconData = {
  alert: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8V13M12 16.5V16.6M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  apple: {
    width: 21,
    height: 21,
    xml: '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.6329 6.034C9.80341 6.034 8.51979 5.09075 7.16791 5.124C5.38291 5.14762 3.74666 6.15912 2.82704 7.76125C0.974664 10.9769 2.34929 15.7264 4.15616 18.34C5.04254 19.6122 6.08816 21.0438 7.47416 20.9991C8.80416 20.9423 9.30291 20.1355 10.9173 20.1355C12.5194 20.1355 12.9735 20.9991 14.3823 20.965C15.8147 20.9422 16.7238 19.67 17.5988 18.3855C18.6103 16.9085 19.0303 15.4761 19.053 15.3974C19.0189 15.386 16.2688 14.329 16.2355 11.1475C16.2128 8.4875 18.4055 7.21525 18.5079 7.15837C17.2575 5.32962 15.3378 5.12488 14.6667 5.07937C12.9167 4.94287 11.451 6.034 10.6329 6.034ZM13.5887 3.35125C14.3263 2.46575 14.8137 1.22763 14.678 0C13.6219 0.0455 12.3488 0.704375 11.5875 1.59075C10.905 2.37475 10.3153 3.6365 10.4737 4.8405C11.6444 4.9315 12.8493 4.2385 13.5878 3.35213" fill="currentColor"/></svg>',
  },
  arrowLeft: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 12H5M11 18L5 12L11 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  arrowRight: {
    width: 22,
    height: 22,
    xml: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.58334 11H17.4167M12.8333 15.5834L17.4167 11L12.8333 6.41669" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  arrowSend: {
    width: 18,
    height: 18,
    xml: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.75 9H14.25M10.5 12.75L14.25 9L10.5 5.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  bag: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 8H19L18 21H6L5 8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 10V6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  bell: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 21H14M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 15 3 17H21C21 15 18 15 18 8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  camera: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7H7L9 4H15L17 7H21V20H3V7Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  chat: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12C21 16.4183 16.9706 20 12 20C10.6 20 9.3 19.72 8.13 19.2L3 20L4.3 16.1C3.48 14.9 3 13.5 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  check: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12.5L10 17.5L19 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  chevronRight: {
    width: 19,
    height: 19,
    xml: '<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.125 3.95825L12.6667 9.49992L7.125 15.0416" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  chevronSmall: {
    width: 15,
    height: 15,
    xml: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.625 3.125L10 7.5L5.625 11.875" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  clock: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 7V12L15 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  close: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  copy: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 9H19V19H9V9Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 9V5H5V15H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  document: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3H6V21H18V7L14 3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 3V7H18M9 13H15M9 17H13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  envelope: {
    width: 19,
    height: 19,
    xml: '<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.0417 3.95837H3.95833C3.08388 3.95837 2.375 4.66726 2.375 5.54171V13.4584C2.375 14.3328 3.08388 15.0417 3.95833 15.0417H15.0417C15.9161 15.0417 16.625 14.3328 16.625 13.4584V5.54171C16.625 4.66726 15.9161 3.95837 15.0417 3.95837Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.375 4.75L9.5 10.2917L16.625 4.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  eye: {
    width: 21,
    height: 21,
    xml: '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.75 10.5C1.75 10.5 5.25 4.375 10.5 4.375C15.75 4.375 19.25 10.5 19.25 10.5C19.25 10.5 15.75 16.625 10.5 16.625C5.25 16.625 1.75 10.5 1.75 10.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 13.125C11.9497 13.125 13.125 11.9497 13.125 10.5C13.125 9.05025 11.9497 7.875 10.5 7.875C9.05025 7.875 7.875 9.05025 7.875 10.5C7.875 11.9497 9.05025 13.125 10.5 13.125Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  giftTicket: {
    width: 21,
    height: 21,
    xml: '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.625 5.25H18.375V8.75C17.9109 8.75 17.4658 8.93437 17.1376 9.26256C16.8094 9.59075 16.625 10.0359 16.625 10.5C16.625 10.9641 16.8094 11.4092 17.1376 11.7374C17.4658 12.0656 17.9109 12.25 18.375 12.25V15.75H2.625V12.25C3.08913 12.25 3.53425 12.0656 3.86244 11.7374C4.19063 11.4092 4.375 10.9641 4.375 10.5C4.375 10.0359 4.19063 9.59075 3.86244 9.26256C3.53425 8.93437 3.08913 8.75 2.625 8.75V5.25Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.125 5.25V7.875M13.125 10.5V12.25M13.125 14V15.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  gift: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11H20V21H4V11Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 7H21V11H3V7ZM12 7V21M12 7C12 7 11 3 8.5 3C7.12 3 6.5 4 6.5 5C6.5 6 7.5 7 9 7M12 7C12 7 13 3 15.5 3C16.88 3 17.5 4 17.5 5C17.5 6 16.5 7 15 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  globe: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12C21 16.9706 16.9706 21 12 21M21 12C21 7.02944 16.9706 3 12 3M21 12H3M12 21C7.02944 21 3 16.9706 3 12M12 21C14.5 18.5 15.5 15.5 15.5 12C15.5 8.5 14.5 5.5 12 3M12 21C9.5 18.5 8.5 15.5 8.5 12C8.5 8.5 9.5 5.5 12 3M3 12C3 7.02944 7.02944 3 12 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  google: {
    width: 21,
    height: 22,
    xml: '<svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.9288 10.9227C20.9288 10.1654 20.8609 9.43721 20.7347 8.73816H10.678V12.8694H16.4247C16.1771 14.2044 15.4248 15.3355 14.2939 16.0928V18.7725H17.7449C19.764 16.9132 20.9288 14.1753 20.9288 10.9227Z" fill="#4285F4"/><path d="M10.678 21.36C13.561 21.36 15.9781 20.4037 17.7448 18.7726L14.2939 16.0928C13.3377 16.7336 12.1146 17.1123 10.678 17.1123C7.89684 17.1123 5.54283 15.2336 4.70315 12.7092H1.13574V15.4763C2.89275 18.9667 6.50385 21.36 10.678 21.36Z" fill="#34A853"/><path d="M4.70316 12.7092C4.4896 12.0684 4.36826 11.3839 4.36826 10.68C4.36826 9.97611 4.4896 9.29162 4.70316 8.65082V5.88373H1.13575C0.412558 7.32553 0 8.95666 0 10.68C0 12.4034 0.412558 14.0345 1.13575 15.4763L4.70316 12.7092Z" fill="#FBBC05"/><path d="M10.678 4.24773C12.2457 4.24773 13.6532 4.78658 14.7599 5.84487L17.8225 2.78165C15.9733 1.05829 13.5562 0 10.678 0C6.50385 0 2.89275 2.39329 1.13574 5.88371L4.70315 8.6508C5.54283 6.12644 7.89684 4.24773 10.678 4.24773Z" fill="#EA4335"/></svg>',
  },
  help: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.1 9A3 3 0 0 1 14.93 10C14.93 12 11.93 13 11.93 13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  idCard: {
    width: 29,
    height: 29,
    xml: '<svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.9584 4.83331H6.04175C4.03972 4.83331 2.41675 6.45628 2.41675 8.45831V20.5416C2.41675 22.5437 4.03972 24.1666 6.04175 24.1666H22.9584C24.9604 24.1666 26.5834 22.5437 26.5834 20.5416V8.45831C26.5834 6.45628 24.9604 4.83331 22.9584 4.83331Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.66667 14.5C11.0014 14.5 12.0833 13.418 12.0833 12.0833C12.0833 10.7486 11.0014 9.66663 9.66667 9.66663C8.33198 9.66663 7.25 10.7486 7.25 12.0833C7.25 13.418 8.33198 14.5 9.66667 14.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.04175 19.3333C6.04175 15.7083 13.2917 15.7083 13.2917 19.3333M16.9167 10.875H22.9584M16.9167 15.7083H22.9584M16.9167 19.3333H20.5417" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  location: {
    width: 17,
    height: 17,
    xml: '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.4583 7.08333C13.4583 10.625 8.5 14.875 8.5 14.875C8.5 14.875 3.54167 10.625 3.54167 7.08333C3.54167 6.4322 3.66992 5.78743 3.9191 5.18586C4.16828 4.58429 4.5335 4.03769 4.99393 3.57726C5.45435 3.11684 6.00095 2.75161 6.60253 2.50243C7.2041 2.25325 7.84886 2.125 8.5 2.125C9.15114 2.125 9.7959 2.25325 10.3975 2.50243C10.999 2.75161 11.5456 3.11684 12.0061 3.57726C12.4665 4.03769 12.8317 4.58429 13.0809 5.18586C13.3301 5.78743 13.4583 6.4322 13.4583 7.08333Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 8.5C9.2824 8.5 9.91667 7.86573 9.91667 7.08333C9.91667 6.30093 9.2824 5.66666 8.5 5.66666C7.7176 5.66666 7.08333 6.30093 7.08333 7.08333C7.08333 7.86573 7.7176 8.5 8.5 8.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  lock: {
    width: 21,
    height: 21,
    xml: '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.875 8.75H6.125C5.1585 8.75 4.375 9.5335 4.375 10.5V16.625C4.375 17.5915 5.1585 18.375 6.125 18.375H14.875C15.8415 18.375 16.625 17.5915 16.625 16.625V10.5C16.625 9.5335 15.8415 8.75 14.875 8.75Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 8.75V6.125C7 5.19674 7.36875 4.3065 8.02513 3.65013C8.6815 2.99375 9.57174 2.625 10.5 2.625C11.4283 2.625 12.3185 2.99375 12.9749 3.65013C13.6313 4.3065 14 5.19674 14 6.125V8.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  logoSymbol: {
    width: 34,
    height: 34,
    xml: '<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26.0312 0H7.96875C3.56773 0 0 3.56773 0 7.96875V26.0312C0 30.4323 3.56773 34 7.96875 34H26.0312C30.4323 34 34 30.4323 34 26.0312V7.96875C34 3.56773 30.4323 0 26.0312 0Z" fill="#FFDA38"/><path fill-rule="evenodd" clip-rule="evenodd" d="M10.625 6.90625H17.5312C22.0469 6.90625 24.7031 9.1375 24.7031 12.4312C24.7031 14.3969 23.6406 15.9375 21.9406 16.6812C24.3312 17.3719 25.5 19.0719 25.5 21.3563C25.5 24.9688 22.6313 27.0938 18.0625 27.0938H10.625C9.72187 27.0938 9.03125 26.4031 9.03125 25.5V18.8594C10.0406 18.8594 10.8906 18.0094 10.8906 17C10.8906 15.9906 10.0406 15.1406 9.03125 15.1406V8.5C9.03125 7.59687 9.72187 6.90625 10.625 6.90625ZM14.3438 11.1562V14.875H17.2656C19.0719 14.875 19.9219 14.1844 19.9219 13.0156C19.9219 11.8469 19.0719 11.1562 17.2656 11.1562H14.3438ZM14.3438 18.8594V22.8438H17.7969C19.7094 22.8438 20.7188 22.1531 20.7188 20.8781C20.7188 19.55 19.7094 18.8594 17.7969 18.8594H14.3438Z" fill="#1D2637"/></svg>',
  },
  logout: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 21H5V3H9M16 17L21 12L16 7M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  moon: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 14.5A8 8 0 1 1 9.5 4A6.5 6.5 0 0 0 20 14.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  settings: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V21A2 2 0 1 1 10.08 21V20.91A1.65 1.65 0 0 0 9 19.4A1.65 1.65 0 0 0 7.18 19.73L7.12 19.79A2 2 0 1 1 4.29 16.96L4.35 16.9A1.65 1.65 0 0 0 4.68 15.08A1.65 1.65 0 0 0 3.17 14.08H3A2 2 0 1 1 3 10.08H3.09A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 4.27 7.18L4.21 7.12A2 2 0 1 1 7.04 4.29L7.1 4.35A1.65 1.65 0 0 0 8.92 4.68H9A1.65 1.65 0 0 0 10 3.17V3A2 2 0 1 1 14 3V3.09A1.65 1.65 0 0 0 15 4.6A1.65 1.65 0 0 0 16.82 4.27L16.88 4.21A2 2 0 1 1 19.71 7.04L19.65 7.1A1.65 1.65 0 0 0 19.32 8.92V9A1.65 1.65 0 0 0 20.83 10H21A2 2 0 1 1 21 14H20.91A1.65 1.65 0 0 0 19.4 15Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  share: {
    width: 18,
    height: 18,
    xml: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12V2.25M12 5.25L9 2.25L6 5.25M3.75 9.75V15H14.25V9.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  shield: {
    width: 18,
    height: 18,
    xml: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 2.25L15 4.5V9C15 12.75 9 15.75 9 15.75C9 15.75 3 12.75 3 9V4.5L9 2.25Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9L8.25 11.25L12 6.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  star: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L14.8 8.6L21 9.5L16.5 13.9L17.6 20L12 17.1L6.4 20L7.5 13.9L3 9.5L9.2 8.6L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  tabHome: {
    width: 22,
    height: 22,
    xml: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.75 9.16667L11 2.75L19.25 9.16667V19.25H13.75V12.8333H8.25V19.25H2.75V9.16667Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  tabProfile: {
    width: 22,
    height: 22,
    xml: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 10.0833C13.025 10.0833 14.6666 8.44171 14.6666 6.41667C14.6666 4.39162 13.025 2.75 11 2.75C8.97494 2.75 7.33331 4.39162 7.33331 6.41667C7.33331 8.44171 8.97494 10.0833 11 10.0833Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.66666 19.2501V16.5001C3.66666 14.5552 4.43927 12.6899 5.81454 11.3146C7.18981 9.93936 9.05507 9.16675 11 9.16675C12.9449 9.16675 14.8102 9.93936 16.1854 11.3146C17.5607 12.6899 18.3333 14.5552 18.3333 16.5001V19.2501" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  tabSponsors: {
    width: 22,
    height: 22,
    xml: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 12.8333C12.2156 12.8333 13.3814 12.3504 14.2409 11.4909C15.1004 10.6314 15.5833 9.46558 15.5833 8.25V2.75H6.41667V8.25C6.41667 9.46558 6.89955 10.6314 7.75909 11.4909C8.61864 12.3504 9.78442 12.8333 11 12.8333ZM11 12.8333V18.3333M6.41667 4.58333H2.75V7.33333C2.75 8.30579 3.13631 9.23843 3.82394 9.92606C4.51158 10.6137 5.44421 11 6.41667 11M15.5833 4.58333H19.25V7.33333C19.25 8.30579 18.8637 9.23843 18.1761 9.92606C17.4884 10.6137 16.5558 11 15.5833 11M7.33333 19.25H14.6667" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  tabTickets: {
    width: 22,
    height: 22,
    xml: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.75 5.5V8.25M13.75 11V12.8333M13.75 14.6667V16.5M2.75 5.5H19.25V9.16667C18.7638 9.16667 18.2975 9.35982 17.9536 9.70364C17.6098 10.0475 17.4167 10.5138 17.4167 11C17.4167 11.4862 17.6098 11.9525 17.9536 12.2964C18.2975 12.6402 18.7638 12.8333 19.25 12.8333V16.5H2.75V12.8333C3.23623 12.8333 3.70255 12.6402 4.04636 12.2964C4.39018 11.9525 4.58333 11.4862 4.58333 11C4.58333 10.5138 4.39018 10.0475 4.04636 9.70364C3.70255 9.35982 3.23623 9.16667 2.75 9.16667V5.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  ticket: {
    width: 23,
    height: 23,
    xml: '<svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.875 6.70831H20.125V10.5416C19.6167 10.5416 19.1292 10.7436 18.7697 11.103C18.4103 11.4625 18.2083 11.95 18.2083 12.4583C18.2083 12.9666 18.4103 13.4542 18.7697 13.8136C19.1292 14.173 19.6167 14.375 20.125 14.375V17.25H2.875V14.375C3.38333 14.375 3.87084 14.173 4.23029 13.8136C4.58973 13.4542 4.79167 12.9666 4.79167 12.4583C4.79167 11.95 4.58973 11.4625 4.23029 11.103C3.87084 10.7436 3.38333 10.5416 2.875 10.5416V6.70831Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.375 6.70831V8.62498M14.375 11.5V13.4166M14.375 15.3333V17.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  trash: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7H20M10 11V17M14 11V17M6 7L7 20H17L18 7M9 7V4H15V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  trophy: {
    width: 25,
    height: 25,
    xml: '<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 14.5833C13.8813 14.5833 15.2061 14.0346 16.1828 13.0578C17.1596 12.0811 17.7083 10.7563 17.7083 9.375V3.125H7.29167V9.375C7.29167 10.7563 7.8404 12.0811 8.81715 13.0578C9.7939 14.0346 11.1187 14.5833 12.5 14.5833ZM12.5 14.5833V20.8333M7.29167 5.20833H3.125V8.33333C3.125 9.4384 3.56399 10.4982 4.34539 11.2796C5.12679 12.061 6.1866 12.5 7.29167 12.5M17.7083 5.20833H21.875V8.33333C21.875 9.4384 21.436 10.4982 20.6546 11.2796C19.8732 12.061 18.8134 12.5 17.7083 12.5M8.33333 21.875H16.6667" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  users: {
    width: 24,
    height: 24,
    xml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 20V18C16 15.79 14.21 14 12 14H6C3.79 14 2 15.79 2 18V20M22 20V18C22 16.14 20.73 14.57 19 14.13M16 3.13C17.73 3.57 19 5.14 19 7C19 8.86 17.73 10.43 16 10.87M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  wheel: {
    width: 300,
    height: 300,
    xml: '<svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M150 150L106.12 14.95C134.639 5.68334 165.361 5.68334 193.88 14.95L150 150Z" fill="#FFF7D3" stroke="white" stroke-width="2"/><path d="M150 150L193.88 14.95C222.4 24.2166 247.254 42.2741 264.88 66.5345L150 150Z" fill="#EEE9FF" stroke="white" stroke-width="2"/><path d="M150 150L264.88 66.5345C282.507 90.7948 292 120.013 292 150H150Z" fill="white" stroke="white" stroke-width="2"/><path d="M150 150H292C292 179.987 282.507 209.205 264.88 233.465L150 150Z" fill="#FFE5D8" stroke="white" stroke-width="2"/><path d="M150 150L264.88 233.465C247.254 257.726 222.4 275.783 193.88 285.05L150 150Z" fill="#FFF7D3" stroke="white" stroke-width="2"/><path d="M150 150L193.88 285.05C165.361 294.317 134.639 294.317 106.12 285.05L150 150Z" fill="white" stroke="white" stroke-width="2"/><path d="M150 150L106.12 285.05C77.5999 275.783 52.7458 257.726 35.1196 233.465L150 150Z" fill="#EEE9FF" stroke="white" stroke-width="2"/><path d="M150 150L35.1196 233.465C17.4934 209.205 8 179.987 8 150H150Z" fill="white" stroke="white" stroke-width="2"/><path d="M150 150H8C8 120.013 17.4934 90.7948 35.1196 66.5345L150 150Z" fill="#FFE5D8" stroke="white" stroke-width="2"/><path d="M150 150L35.1196 66.5345C52.7458 42.2741 77.5999 24.2166 106.12 14.95L150 150Z" fill="white" stroke="white" stroke-width="2"/><path d="M150 293C228.977 293 293 228.977 293 150C293 71.0233 228.977 7 150 7C71.0233 7 7 71.0233 7 150C7 228.977 71.0233 293 150 293Z" stroke="#1D2637" stroke-width="2"/></svg>',
  },
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof iconData;
