import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace";
/**
 * Model BankingDetails
 *
 */
export type BankingDetailsModel = runtime.Types.Result.DefaultSelection<Prisma.$BankingDetailsPayload>;
export type AggregateBankingDetails = {
    _count: BankingDetailsCountAggregateOutputType | null;
    _min: BankingDetailsMinAggregateOutputType | null;
    _max: BankingDetailsMaxAggregateOutputType | null;
};
export type BankingDetailsMinAggregateOutputType = {
    id: string | null;
    title: string | null;
    iban: string | null;
    fullName: string | null;
    userId: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type BankingDetailsMaxAggregateOutputType = {
    id: string | null;
    title: string | null;
    iban: string | null;
    fullName: string | null;
    userId: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type BankingDetailsCountAggregateOutputType = {
    id: number;
    title: number;
    iban: number;
    fullName: number;
    userId: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
};
export type BankingDetailsMinAggregateInputType = {
    id?: true;
    title?: true;
    iban?: true;
    fullName?: true;
    userId?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type BankingDetailsMaxAggregateInputType = {
    id?: true;
    title?: true;
    iban?: true;
    fullName?: true;
    userId?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type BankingDetailsCountAggregateInputType = {
    id?: true;
    title?: true;
    iban?: true;
    fullName?: true;
    userId?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type BankingDetailsAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which BankingDetails to aggregate.
     */
    where?: Prisma.BankingDetailsWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of BankingDetails to fetch.
     */
    orderBy?: Prisma.BankingDetailsOrderByWithRelationInput | Prisma.BankingDetailsOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: Prisma.BankingDetailsWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` BankingDetails from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` BankingDetails.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned BankingDetails
    **/
    _count?: true | BankingDetailsCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
    **/
    _min?: BankingDetailsMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
    **/
    _max?: BankingDetailsMaxAggregateInputType;
};
export type GetBankingDetailsAggregateType<T extends BankingDetailsAggregateArgs> = {
    [P in keyof T & keyof AggregateBankingDetails]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateBankingDetails[P]> : Prisma.GetScalarType<T[P], AggregateBankingDetails[P]>;
};
export type BankingDetailsGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.BankingDetailsWhereInput;
    orderBy?: Prisma.BankingDetailsOrderByWithAggregationInput | Prisma.BankingDetailsOrderByWithAggregationInput[];
    by: Prisma.BankingDetailsScalarFieldEnum[] | Prisma.BankingDetailsScalarFieldEnum;
    having?: Prisma.BankingDetailsScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: BankingDetailsCountAggregateInputType | true;
    _min?: BankingDetailsMinAggregateInputType;
    _max?: BankingDetailsMaxAggregateInputType;
};
export type BankingDetailsGroupByOutputType = {
    id: string;
    title: string;
    iban: string;
    fullName: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    _count: BankingDetailsCountAggregateOutputType | null;
    _min: BankingDetailsMinAggregateOutputType | null;
    _max: BankingDetailsMaxAggregateOutputType | null;
};
export type GetBankingDetailsGroupByPayload<T extends BankingDetailsGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<BankingDetailsGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof BankingDetailsGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], BankingDetailsGroupByOutputType[P]> : Prisma.GetScalarType<T[P], BankingDetailsGroupByOutputType[P]>;
}>>;
export type BankingDetailsWhereInput = {
    AND?: Prisma.BankingDetailsWhereInput | Prisma.BankingDetailsWhereInput[];
    OR?: Prisma.BankingDetailsWhereInput[];
    NOT?: Prisma.BankingDetailsWhereInput | Prisma.BankingDetailsWhereInput[];
    id?: Prisma.StringFilter<"BankingDetails"> | string;
    title?: Prisma.StringFilter<"BankingDetails"> | string;
    iban?: Prisma.StringFilter<"BankingDetails"> | string;
    fullName?: Prisma.StringFilter<"BankingDetails"> | string;
    userId?: Prisma.StringFilter<"BankingDetails"> | string;
    createdAt?: Prisma.DateTimeFilter<"BankingDetails"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"BankingDetails"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    reports?: Prisma.ReportListRelationFilter;
};
export type BankingDetailsOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    iban?: Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
    reports?: Prisma.ReportOrderByRelationAggregateInput;
};
export type BankingDetailsWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.BankingDetailsWhereInput | Prisma.BankingDetailsWhereInput[];
    OR?: Prisma.BankingDetailsWhereInput[];
    NOT?: Prisma.BankingDetailsWhereInput | Prisma.BankingDetailsWhereInput[];
    title?: Prisma.StringFilter<"BankingDetails"> | string;
    iban?: Prisma.StringFilter<"BankingDetails"> | string;
    fullName?: Prisma.StringFilter<"BankingDetails"> | string;
    userId?: Prisma.StringFilter<"BankingDetails"> | string;
    createdAt?: Prisma.DateTimeFilter<"BankingDetails"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"BankingDetails"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    reports?: Prisma.ReportListRelationFilter;
}, "id">;
export type BankingDetailsOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    iban?: Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.BankingDetailsCountOrderByAggregateInput;
    _max?: Prisma.BankingDetailsMaxOrderByAggregateInput;
    _min?: Prisma.BankingDetailsMinOrderByAggregateInput;
};
export type BankingDetailsScalarWhereWithAggregatesInput = {
    AND?: Prisma.BankingDetailsScalarWhereWithAggregatesInput | Prisma.BankingDetailsScalarWhereWithAggregatesInput[];
    OR?: Prisma.BankingDetailsScalarWhereWithAggregatesInput[];
    NOT?: Prisma.BankingDetailsScalarWhereWithAggregatesInput | Prisma.BankingDetailsScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"BankingDetails"> | string;
    title?: Prisma.StringWithAggregatesFilter<"BankingDetails"> | string;
    iban?: Prisma.StringWithAggregatesFilter<"BankingDetails"> | string;
    fullName?: Prisma.StringWithAggregatesFilter<"BankingDetails"> | string;
    userId?: Prisma.StringWithAggregatesFilter<"BankingDetails"> | string;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"BankingDetails"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"BankingDetails"> | Date | string;
};
export type BankingDetailsCreateInput = {
    id?: string;
    title: string;
    iban: string;
    fullName: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutBankingDetailsInput;
    reports?: Prisma.ReportCreateNestedManyWithoutBankingDetailsInput;
};
export type BankingDetailsUncheckedCreateInput = {
    id?: string;
    title: string;
    iban: string;
    fullName: string;
    userId: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    reports?: Prisma.ReportUncheckedCreateNestedManyWithoutBankingDetailsInput;
};
export type BankingDetailsUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutBankingDetailsNestedInput;
    reports?: Prisma.ReportUpdateManyWithoutBankingDetailsNestedInput;
};
export type BankingDetailsUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    reports?: Prisma.ReportUncheckedUpdateManyWithoutBankingDetailsNestedInput;
};
export type BankingDetailsCreateManyInput = {
    id?: string;
    title: string;
    iban: string;
    fullName: string;
    userId: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type BankingDetailsUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type BankingDetailsUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type BankingDetailsScalarRelationFilter = {
    is?: Prisma.BankingDetailsWhereInput;
    isNot?: Prisma.BankingDetailsWhereInput;
};
export type BankingDetailsListRelationFilter = {
    every?: Prisma.BankingDetailsWhereInput;
    some?: Prisma.BankingDetailsWhereInput;
    none?: Prisma.BankingDetailsWhereInput;
};
export type BankingDetailsOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type BankingDetailsCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    iban?: Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type BankingDetailsMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    iban?: Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type BankingDetailsMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    iban?: Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type BankingDetailsCreateNestedOneWithoutReportsInput = {
    create?: Prisma.XOR<Prisma.BankingDetailsCreateWithoutReportsInput, Prisma.BankingDetailsUncheckedCreateWithoutReportsInput>;
    connectOrCreate?: Prisma.BankingDetailsCreateOrConnectWithoutReportsInput;
    connect?: Prisma.BankingDetailsWhereUniqueInput;
};
export type BankingDetailsUpdateOneRequiredWithoutReportsNestedInput = {
    create?: Prisma.XOR<Prisma.BankingDetailsCreateWithoutReportsInput, Prisma.BankingDetailsUncheckedCreateWithoutReportsInput>;
    connectOrCreate?: Prisma.BankingDetailsCreateOrConnectWithoutReportsInput;
    upsert?: Prisma.BankingDetailsUpsertWithoutReportsInput;
    connect?: Prisma.BankingDetailsWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.BankingDetailsUpdateToOneWithWhereWithoutReportsInput, Prisma.BankingDetailsUpdateWithoutReportsInput>, Prisma.BankingDetailsUncheckedUpdateWithoutReportsInput>;
};
export type BankingDetailsCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.BankingDetailsCreateWithoutUserInput, Prisma.BankingDetailsUncheckedCreateWithoutUserInput> | Prisma.BankingDetailsCreateWithoutUserInput[] | Prisma.BankingDetailsUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.BankingDetailsCreateOrConnectWithoutUserInput | Prisma.BankingDetailsCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.BankingDetailsCreateManyUserInputEnvelope;
    connect?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
};
export type BankingDetailsUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.BankingDetailsCreateWithoutUserInput, Prisma.BankingDetailsUncheckedCreateWithoutUserInput> | Prisma.BankingDetailsCreateWithoutUserInput[] | Prisma.BankingDetailsUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.BankingDetailsCreateOrConnectWithoutUserInput | Prisma.BankingDetailsCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.BankingDetailsCreateManyUserInputEnvelope;
    connect?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
};
export type BankingDetailsUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.BankingDetailsCreateWithoutUserInput, Prisma.BankingDetailsUncheckedCreateWithoutUserInput> | Prisma.BankingDetailsCreateWithoutUserInput[] | Prisma.BankingDetailsUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.BankingDetailsCreateOrConnectWithoutUserInput | Prisma.BankingDetailsCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.BankingDetailsUpsertWithWhereUniqueWithoutUserInput | Prisma.BankingDetailsUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.BankingDetailsCreateManyUserInputEnvelope;
    set?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
    disconnect?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
    delete?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
    connect?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
    update?: Prisma.BankingDetailsUpdateWithWhereUniqueWithoutUserInput | Prisma.BankingDetailsUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.BankingDetailsUpdateManyWithWhereWithoutUserInput | Prisma.BankingDetailsUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.BankingDetailsScalarWhereInput | Prisma.BankingDetailsScalarWhereInput[];
};
export type BankingDetailsUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.BankingDetailsCreateWithoutUserInput, Prisma.BankingDetailsUncheckedCreateWithoutUserInput> | Prisma.BankingDetailsCreateWithoutUserInput[] | Prisma.BankingDetailsUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.BankingDetailsCreateOrConnectWithoutUserInput | Prisma.BankingDetailsCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.BankingDetailsUpsertWithWhereUniqueWithoutUserInput | Prisma.BankingDetailsUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.BankingDetailsCreateManyUserInputEnvelope;
    set?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
    disconnect?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
    delete?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
    connect?: Prisma.BankingDetailsWhereUniqueInput | Prisma.BankingDetailsWhereUniqueInput[];
    update?: Prisma.BankingDetailsUpdateWithWhereUniqueWithoutUserInput | Prisma.BankingDetailsUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.BankingDetailsUpdateManyWithWhereWithoutUserInput | Prisma.BankingDetailsUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.BankingDetailsScalarWhereInput | Prisma.BankingDetailsScalarWhereInput[];
};
export type BankingDetailsCreateWithoutReportsInput = {
    id?: string;
    title: string;
    iban: string;
    fullName: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutBankingDetailsInput;
};
export type BankingDetailsUncheckedCreateWithoutReportsInput = {
    id?: string;
    title: string;
    iban: string;
    fullName: string;
    userId: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type BankingDetailsCreateOrConnectWithoutReportsInput = {
    where: Prisma.BankingDetailsWhereUniqueInput;
    create: Prisma.XOR<Prisma.BankingDetailsCreateWithoutReportsInput, Prisma.BankingDetailsUncheckedCreateWithoutReportsInput>;
};
export type BankingDetailsUpsertWithoutReportsInput = {
    update: Prisma.XOR<Prisma.BankingDetailsUpdateWithoutReportsInput, Prisma.BankingDetailsUncheckedUpdateWithoutReportsInput>;
    create: Prisma.XOR<Prisma.BankingDetailsCreateWithoutReportsInput, Prisma.BankingDetailsUncheckedCreateWithoutReportsInput>;
    where?: Prisma.BankingDetailsWhereInput;
};
export type BankingDetailsUpdateToOneWithWhereWithoutReportsInput = {
    where?: Prisma.BankingDetailsWhereInput;
    data: Prisma.XOR<Prisma.BankingDetailsUpdateWithoutReportsInput, Prisma.BankingDetailsUncheckedUpdateWithoutReportsInput>;
};
export type BankingDetailsUpdateWithoutReportsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutBankingDetailsNestedInput;
};
export type BankingDetailsUncheckedUpdateWithoutReportsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type BankingDetailsCreateWithoutUserInput = {
    id?: string;
    title: string;
    iban: string;
    fullName: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    reports?: Prisma.ReportCreateNestedManyWithoutBankingDetailsInput;
};
export type BankingDetailsUncheckedCreateWithoutUserInput = {
    id?: string;
    title: string;
    iban: string;
    fullName: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    reports?: Prisma.ReportUncheckedCreateNestedManyWithoutBankingDetailsInput;
};
export type BankingDetailsCreateOrConnectWithoutUserInput = {
    where: Prisma.BankingDetailsWhereUniqueInput;
    create: Prisma.XOR<Prisma.BankingDetailsCreateWithoutUserInput, Prisma.BankingDetailsUncheckedCreateWithoutUserInput>;
};
export type BankingDetailsCreateManyUserInputEnvelope = {
    data: Prisma.BankingDetailsCreateManyUserInput | Prisma.BankingDetailsCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type BankingDetailsUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.BankingDetailsWhereUniqueInput;
    update: Prisma.XOR<Prisma.BankingDetailsUpdateWithoutUserInput, Prisma.BankingDetailsUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.BankingDetailsCreateWithoutUserInput, Prisma.BankingDetailsUncheckedCreateWithoutUserInput>;
};
export type BankingDetailsUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.BankingDetailsWhereUniqueInput;
    data: Prisma.XOR<Prisma.BankingDetailsUpdateWithoutUserInput, Prisma.BankingDetailsUncheckedUpdateWithoutUserInput>;
};
export type BankingDetailsUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.BankingDetailsScalarWhereInput;
    data: Prisma.XOR<Prisma.BankingDetailsUpdateManyMutationInput, Prisma.BankingDetailsUncheckedUpdateManyWithoutUserInput>;
};
export type BankingDetailsScalarWhereInput = {
    AND?: Prisma.BankingDetailsScalarWhereInput | Prisma.BankingDetailsScalarWhereInput[];
    OR?: Prisma.BankingDetailsScalarWhereInput[];
    NOT?: Prisma.BankingDetailsScalarWhereInput | Prisma.BankingDetailsScalarWhereInput[];
    id?: Prisma.StringFilter<"BankingDetails"> | string;
    title?: Prisma.StringFilter<"BankingDetails"> | string;
    iban?: Prisma.StringFilter<"BankingDetails"> | string;
    fullName?: Prisma.StringFilter<"BankingDetails"> | string;
    userId?: Prisma.StringFilter<"BankingDetails"> | string;
    createdAt?: Prisma.DateTimeFilter<"BankingDetails"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"BankingDetails"> | Date | string;
};
export type BankingDetailsCreateManyUserInput = {
    id?: string;
    title: string;
    iban: string;
    fullName: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type BankingDetailsUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    reports?: Prisma.ReportUpdateManyWithoutBankingDetailsNestedInput;
};
export type BankingDetailsUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    reports?: Prisma.ReportUncheckedUpdateManyWithoutBankingDetailsNestedInput;
};
export type BankingDetailsUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    iban?: Prisma.StringFieldUpdateOperationsInput | string;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
/**
 * Count Type BankingDetailsCountOutputType
 */
export type BankingDetailsCountOutputType = {
    reports: number;
};
export type BankingDetailsCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    reports?: boolean | BankingDetailsCountOutputTypeCountReportsArgs;
};
/**
 * BankingDetailsCountOutputType without action
 */
export type BankingDetailsCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetailsCountOutputType
     */
    select?: Prisma.BankingDetailsCountOutputTypeSelect<ExtArgs> | null;
};
/**
 * BankingDetailsCountOutputType without action
 */
export type BankingDetailsCountOutputTypeCountReportsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ReportWhereInput;
};
export type BankingDetailsSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    iban?: boolean;
    fullName?: boolean;
    userId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    reports?: boolean | Prisma.BankingDetails$reportsArgs<ExtArgs>;
    _count?: boolean | Prisma.BankingDetailsCountOutputTypeDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["bankingDetails"]>;
export type BankingDetailsSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    iban?: boolean;
    fullName?: boolean;
    userId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["bankingDetails"]>;
export type BankingDetailsSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    iban?: boolean;
    fullName?: boolean;
    userId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["bankingDetails"]>;
export type BankingDetailsSelectScalar = {
    id?: boolean;
    title?: boolean;
    iban?: boolean;
    fullName?: boolean;
    userId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};
export type BankingDetailsOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "title" | "iban" | "fullName" | "userId" | "createdAt" | "updatedAt", ExtArgs["result"]["bankingDetails"]>;
export type BankingDetailsInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    reports?: boolean | Prisma.BankingDetails$reportsArgs<ExtArgs>;
    _count?: boolean | Prisma.BankingDetailsCountOutputTypeDefaultArgs<ExtArgs>;
};
export type BankingDetailsIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type BankingDetailsIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type $BankingDetailsPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "BankingDetails";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
        reports: Prisma.$ReportPayload<ExtArgs>[];
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        title: string;
        iban: string;
        fullName: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }, ExtArgs["result"]["bankingDetails"]>;
    composites: {};
};
export type BankingDetailsGetPayload<S extends boolean | null | undefined | BankingDetailsDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload, S>;
export type BankingDetailsCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<BankingDetailsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: BankingDetailsCountAggregateInputType | true;
};
export interface BankingDetailsDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['BankingDetails'];
        meta: {
            name: 'BankingDetails';
        };
    };
    /**
     * Find zero or one BankingDetails that matches the filter.
     * @param {BankingDetailsFindUniqueArgs} args - Arguments to find a BankingDetails
     * @example
     * // Get one BankingDetails
     * const bankingDetails = await prisma.bankingDetails.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BankingDetailsFindUniqueArgs>(args: Prisma.SelectSubset<T, BankingDetailsFindUniqueArgs<ExtArgs>>): Prisma.Prisma__BankingDetailsClient<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find one BankingDetails that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BankingDetailsFindUniqueOrThrowArgs} args - Arguments to find a BankingDetails
     * @example
     * // Get one BankingDetails
     * const bankingDetails = await prisma.bankingDetails.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BankingDetailsFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, BankingDetailsFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__BankingDetailsClient<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first BankingDetails that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BankingDetailsFindFirstArgs} args - Arguments to find a BankingDetails
     * @example
     * // Get one BankingDetails
     * const bankingDetails = await prisma.bankingDetails.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BankingDetailsFindFirstArgs>(args?: Prisma.SelectSubset<T, BankingDetailsFindFirstArgs<ExtArgs>>): Prisma.Prisma__BankingDetailsClient<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first BankingDetails that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BankingDetailsFindFirstOrThrowArgs} args - Arguments to find a BankingDetails
     * @example
     * // Get one BankingDetails
     * const bankingDetails = await prisma.bankingDetails.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BankingDetailsFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, BankingDetailsFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__BankingDetailsClient<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find zero or more BankingDetails that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BankingDetailsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BankingDetails
     * const bankingDetails = await prisma.bankingDetails.findMany()
     *
     * // Get first 10 BankingDetails
     * const bankingDetails = await prisma.bankingDetails.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const bankingDetailsWithIdOnly = await prisma.bankingDetails.findMany({ select: { id: true } })
     *
     */
    findMany<T extends BankingDetailsFindManyArgs>(args?: Prisma.SelectSubset<T, BankingDetailsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    /**
     * Create a BankingDetails.
     * @param {BankingDetailsCreateArgs} args - Arguments to create a BankingDetails.
     * @example
     * // Create one BankingDetails
     * const BankingDetails = await prisma.bankingDetails.create({
     *   data: {
     *     // ... data to create a BankingDetails
     *   }
     * })
     *
     */
    create<T extends BankingDetailsCreateArgs>(args: Prisma.SelectSubset<T, BankingDetailsCreateArgs<ExtArgs>>): Prisma.Prisma__BankingDetailsClient<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Create many BankingDetails.
     * @param {BankingDetailsCreateManyArgs} args - Arguments to create many BankingDetails.
     * @example
     * // Create many BankingDetails
     * const bankingDetails = await prisma.bankingDetails.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends BankingDetailsCreateManyArgs>(args?: Prisma.SelectSubset<T, BankingDetailsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Create many BankingDetails and returns the data saved in the database.
     * @param {BankingDetailsCreateManyAndReturnArgs} args - Arguments to create many BankingDetails.
     * @example
     * // Create many BankingDetails
     * const bankingDetails = await prisma.bankingDetails.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many BankingDetails and only return the `id`
     * const bankingDetailsWithIdOnly = await prisma.bankingDetails.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends BankingDetailsCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, BankingDetailsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    /**
     * Delete a BankingDetails.
     * @param {BankingDetailsDeleteArgs} args - Arguments to delete one BankingDetails.
     * @example
     * // Delete one BankingDetails
     * const BankingDetails = await prisma.bankingDetails.delete({
     *   where: {
     *     // ... filter to delete one BankingDetails
     *   }
     * })
     *
     */
    delete<T extends BankingDetailsDeleteArgs>(args: Prisma.SelectSubset<T, BankingDetailsDeleteArgs<ExtArgs>>): Prisma.Prisma__BankingDetailsClient<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Update one BankingDetails.
     * @param {BankingDetailsUpdateArgs} args - Arguments to update one BankingDetails.
     * @example
     * // Update one BankingDetails
     * const bankingDetails = await prisma.bankingDetails.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends BankingDetailsUpdateArgs>(args: Prisma.SelectSubset<T, BankingDetailsUpdateArgs<ExtArgs>>): Prisma.Prisma__BankingDetailsClient<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Delete zero or more BankingDetails.
     * @param {BankingDetailsDeleteManyArgs} args - Arguments to filter BankingDetails to delete.
     * @example
     * // Delete a few BankingDetails
     * const { count } = await prisma.bankingDetails.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends BankingDetailsDeleteManyArgs>(args?: Prisma.SelectSubset<T, BankingDetailsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more BankingDetails.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BankingDetailsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BankingDetails
     * const bankingDetails = await prisma.bankingDetails.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends BankingDetailsUpdateManyArgs>(args: Prisma.SelectSubset<T, BankingDetailsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more BankingDetails and returns the data updated in the database.
     * @param {BankingDetailsUpdateManyAndReturnArgs} args - Arguments to update many BankingDetails.
     * @example
     * // Update many BankingDetails
     * const bankingDetails = await prisma.bankingDetails.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Update zero or more BankingDetails and only return the `id`
     * const bankingDetailsWithIdOnly = await prisma.bankingDetails.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    updateManyAndReturn<T extends BankingDetailsUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, BankingDetailsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    /**
     * Create or update one BankingDetails.
     * @param {BankingDetailsUpsertArgs} args - Arguments to update or create a BankingDetails.
     * @example
     * // Update or create a BankingDetails
     * const bankingDetails = await prisma.bankingDetails.upsert({
     *   create: {
     *     // ... data to create a BankingDetails
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BankingDetails we want to update
     *   }
     * })
     */
    upsert<T extends BankingDetailsUpsertArgs>(args: Prisma.SelectSubset<T, BankingDetailsUpsertArgs<ExtArgs>>): Prisma.Prisma__BankingDetailsClient<runtime.Types.Result.GetResult<Prisma.$BankingDetailsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Count the number of BankingDetails.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BankingDetailsCountArgs} args - Arguments to filter BankingDetails to count.
     * @example
     * // Count the number of BankingDetails
     * const count = await prisma.bankingDetails.count({
     *   where: {
     *     // ... the filter for the BankingDetails we want to count
     *   }
     * })
    **/
    count<T extends BankingDetailsCountArgs>(args?: Prisma.Subset<T, BankingDetailsCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], BankingDetailsCountAggregateOutputType> : number>;
    /**
     * Allows you to perform aggregations operations on a BankingDetails.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BankingDetailsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BankingDetailsAggregateArgs>(args: Prisma.Subset<T, BankingDetailsAggregateArgs>): Prisma.PrismaPromise<GetBankingDetailsAggregateType<T>>;
    /**
     * Group by BankingDetails.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BankingDetailsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
    **/
    groupBy<T extends BankingDetailsGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: BankingDetailsGroupByArgs['orderBy'];
    } : {
        orderBy?: BankingDetailsGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, BankingDetailsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBankingDetailsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the BankingDetails model
     */
    readonly fields: BankingDetailsFieldRefs;
}
/**
 * The delegate class that acts as a "Promise-like" for BankingDetails.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__BankingDetailsClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    reports<T extends Prisma.BankingDetails$reportsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.BankingDetails$reportsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
/**
 * Fields of the BankingDetails model
 */
export interface BankingDetailsFieldRefs {
    readonly id: Prisma.FieldRef<"BankingDetails", 'String'>;
    readonly title: Prisma.FieldRef<"BankingDetails", 'String'>;
    readonly iban: Prisma.FieldRef<"BankingDetails", 'String'>;
    readonly fullName: Prisma.FieldRef<"BankingDetails", 'String'>;
    readonly userId: Prisma.FieldRef<"BankingDetails", 'String'>;
    readonly createdAt: Prisma.FieldRef<"BankingDetails", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"BankingDetails", 'DateTime'>;
}
/**
 * BankingDetails findUnique
 */
export type BankingDetailsFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * Filter, which BankingDetails to fetch.
     */
    where: Prisma.BankingDetailsWhereUniqueInput;
};
/**
 * BankingDetails findUniqueOrThrow
 */
export type BankingDetailsFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * Filter, which BankingDetails to fetch.
     */
    where: Prisma.BankingDetailsWhereUniqueInput;
};
/**
 * BankingDetails findFirst
 */
export type BankingDetailsFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * Filter, which BankingDetails to fetch.
     */
    where?: Prisma.BankingDetailsWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of BankingDetails to fetch.
     */
    orderBy?: Prisma.BankingDetailsOrderByWithRelationInput | Prisma.BankingDetailsOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for BankingDetails.
     */
    cursor?: Prisma.BankingDetailsWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` BankingDetails from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` BankingDetails.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of BankingDetails.
     */
    distinct?: Prisma.BankingDetailsScalarFieldEnum | Prisma.BankingDetailsScalarFieldEnum[];
};
/**
 * BankingDetails findFirstOrThrow
 */
export type BankingDetailsFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * Filter, which BankingDetails to fetch.
     */
    where?: Prisma.BankingDetailsWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of BankingDetails to fetch.
     */
    orderBy?: Prisma.BankingDetailsOrderByWithRelationInput | Prisma.BankingDetailsOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for BankingDetails.
     */
    cursor?: Prisma.BankingDetailsWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` BankingDetails from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` BankingDetails.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of BankingDetails.
     */
    distinct?: Prisma.BankingDetailsScalarFieldEnum | Prisma.BankingDetailsScalarFieldEnum[];
};
/**
 * BankingDetails findMany
 */
export type BankingDetailsFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * Filter, which BankingDetails to fetch.
     */
    where?: Prisma.BankingDetailsWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of BankingDetails to fetch.
     */
    orderBy?: Prisma.BankingDetailsOrderByWithRelationInput | Prisma.BankingDetailsOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing BankingDetails.
     */
    cursor?: Prisma.BankingDetailsWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` BankingDetails from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` BankingDetails.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of BankingDetails.
     */
    distinct?: Prisma.BankingDetailsScalarFieldEnum | Prisma.BankingDetailsScalarFieldEnum[];
};
/**
 * BankingDetails create
 */
export type BankingDetailsCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * The data needed to create a BankingDetails.
     */
    data: Prisma.XOR<Prisma.BankingDetailsCreateInput, Prisma.BankingDetailsUncheckedCreateInput>;
};
/**
 * BankingDetails createMany
 */
export type BankingDetailsCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many BankingDetails.
     */
    data: Prisma.BankingDetailsCreateManyInput | Prisma.BankingDetailsCreateManyInput[];
    skipDuplicates?: boolean;
};
/**
 * BankingDetails createManyAndReturn
 */
export type BankingDetailsCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * The data used to create many BankingDetails.
     */
    data: Prisma.BankingDetailsCreateManyInput | Prisma.BankingDetailsCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsIncludeCreateManyAndReturn<ExtArgs> | null;
};
/**
 * BankingDetails update
 */
export type BankingDetailsUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * The data needed to update a BankingDetails.
     */
    data: Prisma.XOR<Prisma.BankingDetailsUpdateInput, Prisma.BankingDetailsUncheckedUpdateInput>;
    /**
     * Choose, which BankingDetails to update.
     */
    where: Prisma.BankingDetailsWhereUniqueInput;
};
/**
 * BankingDetails updateMany
 */
export type BankingDetailsUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update BankingDetails.
     */
    data: Prisma.XOR<Prisma.BankingDetailsUpdateManyMutationInput, Prisma.BankingDetailsUncheckedUpdateManyInput>;
    /**
     * Filter which BankingDetails to update
     */
    where?: Prisma.BankingDetailsWhereInput;
    /**
     * Limit how many BankingDetails to update.
     */
    limit?: number;
};
/**
 * BankingDetails updateManyAndReturn
 */
export type BankingDetailsUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelectUpdateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * The data used to update BankingDetails.
     */
    data: Prisma.XOR<Prisma.BankingDetailsUpdateManyMutationInput, Prisma.BankingDetailsUncheckedUpdateManyInput>;
    /**
     * Filter which BankingDetails to update
     */
    where?: Prisma.BankingDetailsWhereInput;
    /**
     * Limit how many BankingDetails to update.
     */
    limit?: number;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsIncludeUpdateManyAndReturn<ExtArgs> | null;
};
/**
 * BankingDetails upsert
 */
export type BankingDetailsUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * The filter to search for the BankingDetails to update in case it exists.
     */
    where: Prisma.BankingDetailsWhereUniqueInput;
    /**
     * In case the BankingDetails found by the `where` argument doesn't exist, create a new BankingDetails with this data.
     */
    create: Prisma.XOR<Prisma.BankingDetailsCreateInput, Prisma.BankingDetailsUncheckedCreateInput>;
    /**
     * In case the BankingDetails was found with the provided `where` argument, update it with this data.
     */
    update: Prisma.XOR<Prisma.BankingDetailsUpdateInput, Prisma.BankingDetailsUncheckedUpdateInput>;
};
/**
 * BankingDetails delete
 */
export type BankingDetailsDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
    /**
     * Filter which BankingDetails to delete.
     */
    where: Prisma.BankingDetailsWhereUniqueInput;
};
/**
 * BankingDetails deleteMany
 */
export type BankingDetailsDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which BankingDetails to delete
     */
    where?: Prisma.BankingDetailsWhereInput;
    /**
     * Limit how many BankingDetails to delete.
     */
    limit?: number;
};
/**
 * BankingDetails.reports
 */
export type BankingDetails$reportsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: Prisma.ReportSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Report
     */
    omit?: Prisma.ReportOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.ReportInclude<ExtArgs> | null;
    where?: Prisma.ReportWhereInput;
    orderBy?: Prisma.ReportOrderByWithRelationInput | Prisma.ReportOrderByWithRelationInput[];
    cursor?: Prisma.ReportWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ReportScalarFieldEnum | Prisma.ReportScalarFieldEnum[];
};
/**
 * BankingDetails without action
 */
export type BankingDetailsDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BankingDetails
     */
    select?: Prisma.BankingDetailsSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the BankingDetails
     */
    omit?: Prisma.BankingDetailsOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.BankingDetailsInclude<ExtArgs> | null;
};
//# sourceMappingURL=BankingDetails.d.ts.map