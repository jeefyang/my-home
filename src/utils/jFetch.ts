import { ItemApiUrl } from "@common/apis/item";
import { PageApiUrl } from "@common/apis/page";
import { TransFetch } from "@common/apis/tools/transFetch";
import { UserApiUrl } from "@common/apis/user";

const prevUrl = "api/";

export const userFetch = new TransFetch(UserApiUrl, prevUrl);
export const pageFetch = new TransFetch(PageApiUrl, prevUrl);
export const itemFetch = new TransFetch(ItemApiUrl, prevUrl);