<template>
  <div class="home-page">
    <div class="page-container">
      <!-- Banner -->
      <div class="home-banner">
        <div class="banner-content">
          <h1 class="banner-title">🍔 LD士多</h1>
          <p class="banner-subtitle">
            <a href="https://linux.do" target="_blank" class="link-linuxdo">LinuxDo社区</a>
            虚拟物品与服务 <span class="highlight-red">兑换中心</span>
          </p>
          <p class="banner-subtitle">
            快使用你的
            <a href="https://credit.linux.do/" target="_blank" class="highlight-yellow link-credit">社区积分</a>
            兑换物品吧
          </p>
        </div>
        <div class="banner-stats">
          <div class="stat-group">
            <div class="stat-item">
              <span class="stat-value">{{ stats.products?.online || 0 }}</span>
              <span class="stat-label">在售物品</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.products?.total || 0 }}</span>
              <span class="stat-label">累计上架</span>
            </div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-group">
            <div class="stat-item">
              <span class="stat-value">{{ stats.orders?.today || 0 }}</span>
              <span class="stat-label">今日成交</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.orders?.week || 0 }}</span>
              <span class="stat-label">7日成交</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.orders?.total || 0 }}</span>
              <span class="stat-label">累计成交</span>
            </div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-group">
            <div class="stat-item">
              <span class="stat-value">{{ stats.stores || 0 }}</span>
              <span class="stat-label">入驻小店</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 板块切换 -->
      <div class="section-tabs-wrapper">
        <LiquidTabs
          v-model="activeSection"
          :tabs="sectionTabs"
          mode="tabs"
          aria-label="首页板块"
          @update:model-value="switchSection"
        />
      </div>
      
      <!-- 物品广场 -->
      <div v-show="activeSection === 'products'" id="home-panel-products" class="section-content" role="tabpanel" aria-labelledby="home-tab-products" tabindex="0">
        <!-- 分类筛选（排除小店） -->
        <div class="filter-section">
          <CategoryFilter
            :categories="marketCategories"
            :current-category="currentCategory"
            @select="handleCategorySelect"
          />
        </div>
        
        <!-- 排序和筛选选项 -->
        <div class="sort-section">
          <div class="sort-options">
            <button
              v-for="tab in sortTabs"
              :key="tab.value"
              type="button"
              class="sort-btn"
              :class="{ active: currentSort === tab.value }"
              :aria-pressed="currentSort === tab.value"
              @click="handleSortChange(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="catalog-filters">
            <div class="price-filter">
              <label for="home-price-min" class="sr-only">最低折后价</label>
              <input
                id="home-price-min"
                v-model="priceMinInput"
                type="number"
                min="0"
                step="0.01"
                class="price-filter-input"
                placeholder="最低折后价"
                @keyup.enter="applyPriceFilter"
              />
              <span class="price-filter-separator">-</span>
              <label for="home-price-max" class="sr-only">最高折后价</label>
              <input
                id="home-price-max"
                v-model="priceMaxInput"
                type="number"
                min="0"
                step="0.01"
                class="price-filter-input"
                placeholder="最高折后价"
                @keyup.enter="applyPriceFilter"
              />
              <button type="button" class="price-filter-btn" @click="applyPriceFilter">筛选</button>
              <button
                v-if="hasDraftPriceFilter || hasActivePriceFilter"
                type="button"
                class="price-filter-btn secondary"
                @click="clearPriceFilter"
              >
                清空
              </button>
            </div>
            <label class="stock-filter">
              <input
                type="checkbox"
                class="stock-filter-input"
                :checked="inStockOnly"
                @change="handleToggleInStock"
              />
              <span class="checkbox" :class="{ checked: inStockOnly }" aria-hidden="true">
                <span class="checkmark" v-if="inStockOnly">✓</span>
              </span>
              <span class="filter-label">只看有货</span>
            </label>
          </div>
        </div>
        
        <!-- 物品统计 -->
        <div class="products-header">
          <span class="products-count">
            <template v-if="isProductListHiddenByMaintenance">
              {{ maintenanceTitle }}
            </template>
            <template v-else>
              {{ currentCategoryName }} 共 <strong>{{ total }}</strong> 件物品
            </template>
            <span v-if="inStockOnly" class="filter-tag">有库存</span>
            <span v-if="hasActivePriceFilter" class="filter-tag price-tag">{{ activePriceFilterLabel }}</span>
          </span>
        </div>
        
        <!-- 物品列表 -->
        <div v-if="initialLoading" class="products-loading">
          <Skeleton type="card" :count="6" :columns="gridColumns" />
        </div>
        
        <div v-else-if="marketProducts.length > 0" class="products-grid" :aria-busy="loading">
          <ProductCard
            v-for="product in marketProducts"
            :key="product.id"
            :product="product"
            :categories="categories"
          />
          
          <!-- 加载更多 -->
          <div v-if="hasMore" ref="sentinel" class="load-more">
            <div v-if="loading" class="loading-indicator">
              <span class="spinner"></span>
              <span>加载中...</span>
            </div>
            <span v-else class="load-hint">⬇️ 滚动加载更多</span>
          </div>
          <div v-else class="loaded-all">✨ 已加载全部</div>
        </div>
        
        <!-- 空状态 -->
        <EmptyState
          v-else
          :icon="isProductListHiddenByMaintenance ? '🚧' : '🛒'"
          :text="isProductListHiddenByMaintenance ? maintenanceTitle : '暂无物品'"
          :hint="isProductListHiddenByMaintenance ? maintenanceCatalogHint : '快来发布第一个物品吧~'"
        >
          <template v-if="!isProductListHiddenByMaintenance" #action>
            <router-link to="/seller/products/new" class="btn btn-primary mt-4">
              ➕ 发布物品
            </router-link>
          </template>
        </EmptyState>
      </div>
      
      <!-- 小店集市 -->
      <div v-show="activeSection === 'stores'" id="home-panel-stores" class="section-content" role="tabpanel" aria-labelledby="home-tab-stores" tabindex="0">
        <div class="stores-header">
          <p class="stores-desc">🏪 汇集各路大佬的自建小店，欢迎入驻🎉</p>
        </div>

        <!-- 小店筛选 -->
        <div class="stores-filter">
          <div class="stores-tag-filter">
            <button
              v-for="tag in SHOPS_TAGS"
              :key="tag"
              class="stores-tag-btn"
              :class="{ active: shopsTagFilter.includes(tag), ['tag-' + tagClassMap[tag]]: shopsTagFilter.includes(tag) }"
              @click="toggleShopsTag(tag)"
            >
              <span>{{ tag }}</span>
              <span v-if="shopsTagFilter.includes(tag)" class="tag-remove" @click.stop="removeShopsTag(tag)">×</span>
            </button>
          </div>
          <div class="stores-search">
            <input
              v-model="shopsSearchKeyword"
              type="text"
              class="stores-search-input"
              placeholder="搜索小店名称、店主或描述"
              @keyup.enter="loadShops(true)"
            />
            <button class="stores-search-btn" @click="loadShops(true)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
          <button
            v-if="shopsTagFilter.length || shopsSearchKeyword.trim()"
            class="stores-reset-btn"
            @click="resetShopsFilter"
          >重置</button>
        </div>
        
        <!-- 小店统计 -->
        <div class="products-header">
          <span class="products-count">
            <template v-if="shopsTagFilter.length || shopsSearchKeyword.trim()">
              筛选结果 共 <strong>{{ shopsTotal }}</strong> 个小店
            </template>
            <template v-else>
              全部 共 <strong>{{ shopsTotal }}</strong> 个小店
            </template>
          </span>
        </div>
        
        <div v-if="shopsInitialLoading" class="products-loading">
          <Skeleton type="card" :count="4" :columns="gridColumns" />
        </div>

        <div v-else-if="shops.length > 0" class="products-grid stores-grid">
          <ShopCard
            v-for="shop in shops"
            :key="shop.id"
            :shop="shop"
          />

          <div v-if="shopsHasMore" ref="shopsSentinel" class="load-more">
            <div v-if="shopsLoading" class="loading-indicator">
              <span class="spinner"></span>
              <span>加载中...</span>
            </div>
            <span v-else class="load-hint">⬇️ 滚动加载更多</span>
          </div>
          <div v-else class="loaded-all">✨ 已加载全部</div>
        </div>
        
        <EmptyState
          v-else
          icon="🏬"
          text="暂无小店"
          hint="快来入驻开设你的第一家小店吧~"
        >
          <template #action>
            <router-link to="/seller/store" class="btn btn-primary mt-4">
              🏪 小店入驻
            </router-link>
          </template>
        </EmptyState>
      </div>

      <div v-show="activeSection === 'buy'" id="home-panel-buy" class="section-content" role="tabpanel" aria-labelledby="home-tab-buy" tabindex="0">
        <div class="buy-header">
          <p class="buy-desc">🚨 为了保证双方的权益，请勿在私信中直接联系方式。沟通好积分后支付LDC后会开放双方L站联系方式！🪧<a href="/docs/buy-request" style="color: green;">查看求购操作指南👈</a></p>
          
          <button class="buy-publish-btn" @click="publishBuyRequest">+ 发布求购</button>
        </div>

        <div class="buy-toolbar">
          <AppSelect
            v-model="buyStatusFilter"
            :options="[{ value: '', label: '全部状态' }, ...buyStatusOptions]"
            variant="toolbar"
            class="buy-toolbar-select"
            @change="loadBuyRequests(true)"
          />
          <div class="buy-toolbar-search">
            <input
              v-model="buySearchKeyword"
              type="text"
              class="buy-toolbar-input"
              placeholder="搜索求购标题或内容"
              @keyup.enter="loadBuyRequests(true)"
            />
            <button class="buy-toolbar-btn buy-toolbar-btn-search" @click="loadBuyRequests(true)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
          <button class="buy-toolbar-btn secondary buy-toolbar-btn-refresh" @click="loadBuyRequests(false)">换一批</button>
        </div>

        <div class="products-header">
          <span class="products-count">
            求购信息 <strong>{{ buyPagination.total }}</strong> 条
          </span>
        </div>

        <div v-if="buyLoading || !buyInitialized" class="products-loading">
          <Skeleton type="card" :count="6" :columns="gridColumns" />
        </div>

        <div v-else-if="buyRequests.length > 0" class="buy-grid">
          <article
            v-for="item in buyRequests"
            :key="item.id"
            class="buy-card"
          >
            <router-link
              :to="`/buy-request/${item.id}`"
              class="buy-card-link"
              :aria-label="`查看求购：${item.title}`"
            >
              <div class="buy-card-head">
                <h3 class="buy-card-title">{{ item.title }}</h3>
                <span :class="['buy-status-pill', `buy-status-${buyStatusClass(item.status)}`]">
                  {{ buyStatusText(item.status) }}
                </span>
              </div>
              <p class="buy-card-detail">{{ item.details }}</p>
              <div class="buy-card-meta">
                <span class="buy-price">{{ item.budgetPrice }} LDC</span>
                <span class="buy-meta-sep">·</span>
                <span>{{ item.requesterPublicUsername }}</span>
                <span class="buy-meta-sep">·</span>
                <span>密码 {{ item.requesterPublicPassword }}</span>
              </div>
              <div class="buy-card-footer">
                <span>会话 {{ item.sessionCount || 0 }}</span>
                <span>{{ formatRelativeTime(item.updatedAt || item.createdAt) }}</span>
              </div>
            </router-link>
          </article>
        </div>

        <EmptyState
          v-else
          icon="🌱"
          text="暂无求购信息"
          hint="你可以先发布你的需求，等待服务方联系"
        >
          <template #action>
            <button class="btn btn-primary mt-4" @click="publishBuyRequest">
              + 发布求购
            </button>
          </template>
        </EmptyState>

        <div v-if="buyPagination.totalPages > 1" class="buy-pagination">
          <button
            class="buy-page-btn"
            :disabled="buyPagination.page <= 1 || buyLoading"
            @click="goBuyPage(buyPagination.page - 1)"
          >
            上一页
          </button>
          <span class="buy-page-text">第 {{ buyPagination.page }} / {{ buyPagination.totalPages }} 页</span>
          <button
            class="buy-page-btn"
            :disabled="buyPagination.page >= buyPagination.totalPages || buyLoading"
            @click="goBuyPage(buyPagination.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <!-- 士多热榜 -->
      <div v-show="activeSection === 'hotboard'" id="home-panel-hotboard" class="section-content hotboard-section-wrapper" role="tabpanel" aria-labelledby="home-tab-hotboard" tabindex="0">
        <div v-if="hotboardLoading && !hotboardData" class="products-loading">
          <Skeleton type="card" :count="4" :columns="2" />
        </div>

        <div v-else-if="hotboardError && !hotboardData" class="hotboard-error">
          <EmptyState icon="📊" :text="hotboardError" hint="请稍后重试" />
        </div>

        <div v-else-if="hotboardData" class="hotboard-container">
          <!-- 总览 Hero -->
          <div class="hotboard-hero">
            <div class="hotboard-hero-head">
              <div class="hotboard-hero-title">
                <span class="hotboard-hero-icon">📊</span>
                <span>士多热榜</span>
              </div>
              <span class="hotboard-hero-tl">TL{{ hotboardData.trustLevel }}</span>
            </div>
            <div class="hotboard-hero-stats">
              <div class="hotboard-hero-stat">
                <span class="hotboard-hero-stat-value">{{ formatNumber(Number(hotboardData.totalStats?.totalViews || 0)) }}</span>
                <span class="hotboard-hero-stat-label">今日物品总浏览</span>
              </div>
              <div class="hotboard-hero-stat-divider"></div>
              <div class="hotboard-hero-stat">
                <span class="hotboard-hero-stat-value">{{ formatNumber(Number(hotboardData.totalStats?.totalOrders || 0)) }}</span>
                <span class="hotboard-hero-stat-label">今日总单数</span>
              </div>
              <div class="hotboard-hero-stat-divider"></div>
              <div class="hotboard-hero-stat">
                <span class="hotboard-hero-stat-value">{{ formatNumber(Number(hotboardData.totalStats?.totalSoldQuantity ?? hotboardData.totalStats?.totalSold ?? 0)) }}</span>
                <span class="hotboard-hero-stat-label">今日售出件数</span>
              </div>
            </div>
            <p class="hotboard-hero-hint">{{ hotboardLoading ? '正在更新热榜…' : (hotboardError || '数据基于北京时间今日 · 页面停留时约2分钟刷新') }}</p>
          </div>

          <!-- 热卖卖家 Top3 -->
          <div class="hotboard-section" v-if="hotboardData.sellerTop?.length">
            <h3 class="hotboard-section-title">🔥 今日热卖卖家</h3>
            <div class="hotboard-seller-list">
              <router-link
                v-for="seller in hotboardData.sellerTop"
                :key="seller.username"
                :to="`/merchant/${seller.username}`"
                class="hotboard-seller-item"
                :class="`seller-rank-${seller.rank}`"
              >
                <span class="hotboard-seller-medal">
                  <template v-if="seller.rank === 1">🥇</template>
                  <template v-else-if="seller.rank === 2">🥈</template>
                  <template v-else-if="seller.rank === 3">🥉</template>
                </span>
                <AvatarImage
                  :candidates="[seller.avatar]"
                  :seed="seller.username"
                  :size="44"
                  :alt="seller.username"
                  class="hotboard-seller-avatar"
                  :style="{ width: '44px', height: '44px', borderRadius: '50%' }"
                />
                <span class="hotboard-seller-name">{{ seller.username }}</span>
              </router-link>
            </div>
          </div>

          <!-- 浏览 Top5 -->
          <div class="hotboard-section" v-if="hotboardData.viewTop?.length">
            <h3 class="hotboard-section-title">👀 今日浏览榜</h3>
            <div class="hotboard-product-list">
              <router-link
                v-for="item in hotboardData.viewTop"
                :key="item.id"
                :to="`/product/${item.id}`"
                class="hotboard-product-item"
              >
                <span class="hotboard-rank-badge" :class="`rank-${item.rank}`">{{ item.rank }}</span>
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="hotboard-product-image" />
                <div v-else class="hotboard-product-image-placeholder">📦</div>
                <div class="hotboard-product-info">
                  <span class="hotboard-product-name">{{ item.name }}</span>
                  <span class="hotboard-product-meta">
                    {{ item.categoryIcon }} {{ item.categoryName }}<template v-if="item.sellerUsername"> · {{ item.sellerUsername }}</template>
                  </span>
                </div>
                <div class="hotboard-product-right">
                  <span class="hotboard-product-count">{{ item.viewCount }}<span class="hotboard-count-unit">次</span></span>
                  <span class="hotboard-product-price">{{ formatPrice(item.discount ? item.price * item.discount : item.price ?? 0) }}<span class="hotboard-price-unit">LDC</span></span>
                </div>
              </router-link>
            </div>
          </div>

          <!-- 热卖 Top5 -->
          <div class="hotboard-section" v-if="hotboardData.soldTop?.length">
            <h3 class="hotboard-section-title">🛍️ 今日热卖榜</h3>
            <div class="hotboard-product-list">
              <router-link
                v-for="item in hotboardData.soldTop"
                :key="item.id"
                :to="`/product/${item.id}`"
                class="hotboard-product-item"
              >
                <span class="hotboard-rank-badge" :class="`rank-${item.rank}`">{{ item.rank }}</span>
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="hotboard-product-image" />
                <div v-else class="hotboard-product-image-placeholder">📦</div>
                <div class="hotboard-product-info">
                  <span class="hotboard-product-name">{{ item.name }}</span>
                  <span class="hotboard-product-meta">
                    {{ item.categoryIcon }} {{ item.categoryName }}<template v-if="item.sellerUsername"> · {{ item.sellerUsername }}</template>
                  </span>
                </div>
                <div class="hotboard-product-right">
                  <span class="hotboard-product-count">{{ item.soldQuantity }}<span class="hotboard-count-unit">已售</span></span>
                  <span class="hotboard-product-price">{{ formatPrice(item.discount ? item.price * item.discount : item.price ?? 0) }}<span class="hotboard-price-unit">LDC</span></span>
                </div>
              </router-link>
            </div>
          </div>

          <!-- 分类成交分布 -->
          <div class="hotboard-section" v-if="trendChartModel.length">
            <h3 class="hotboard-section-title">📈 分类成交分布</h3>
            <div class="hotboard-cat-bars">
              <div
                v-for="cat in trendChartModel"
                :key="cat.categoryId"
                class="hotboard-cat-row"
              >
                <span class="hotboard-cat-label">{{ cat.categoryIcon }} {{ cat.categoryName }}</span>
                <div class="hotboard-cat-bar-track">
                  <div
                    class="hotboard-cat-bar-fill"
                    :style="{
                      width: getCatBarWidth(cat) + '%',
                      background: cat.color
                    }"
                  ></div>
                </div>
                <span class="hotboard-cat-value">{{ formatTrendShare(cat) }}</span>
              </div>
            </div>
            <div v-if="hourlyTrendPoints.length" class="hotboard-hourly-section">
              <div class="hotboard-hourly-heading">
                <div>
                  <p class="hotboard-hourly-title">逐时订单走势</p>
                  <p class="hotboard-hourly-subtitle">北京时间 · 每小时相对趋势</p>
                </div>
                <span class="hotboard-hourly-meta">
                  <span class="hotboard-hourly-live-dot" aria-hidden="true"></span>
                  更新至 {{ trendEndHourLabel }}
                </span>
              </div>
              <div class="hotboard-trend-plot">
                <div class="hotboard-trend-chart-wrap">
                  <svg
                    class="hotboard-trend-chart"
                    viewBox="0 0 960 320"
                    preserveAspectRatio="none"
                    shape-rendering="geometricPrecision"
                    role="img"
                    :aria-label="trendChartAriaLabel"
                    @pointermove="updateTrendHover"
                    @pointerleave="clearTrendHover"
                  >
                    <title>{{ trendChartAriaLabel }}</title>
                    <defs>
                      <linearGradient id="hotboard-trend-stroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#6ca7a3" />
                        <stop offset="48%" stop-color="#6f98bd" />
                        <stop offset="100%" stop-color="#8f82c4" />
                      </linearGradient>
                      <linearGradient id="hotboard-trend-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#719cb9" stop-opacity="0.2" />
                        <stop offset="72%" stop-color="#719cb9" stop-opacity="0.035" />
                        <stop offset="100%" stop-color="#719cb9" stop-opacity="0" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="960" height="320" fill="transparent" class="hotboard-trend-hit-area" />

                    <rect
                      :x="trendProgressX"
                      y="0"
                      :width="Math.max(0, TVB_W - trendProgressX)"
                      height="320"
                      class="hotboard-trend-future"
                    />
                    <line
                      v-for="y in trendGridY"
                      :key="`grid-y-${y}`"
                      x1="0"
                      :y1="y"
                      x2="960"
                      :y2="y"
                      class="hotboard-trend-grid-line"
                      vector-effect="non-scaling-stroke"
                    />
                    <line
                      v-for="hour in trendGridHours"
                      :key="`grid-x-${hour}`"
                      :x1="trendTimeX(hour)"
                      y1="0"
                      :x2="trendTimeX(hour)"
                      y2="320"
                      class="hotboard-trend-grid-line hotboard-trend-grid-line-vertical"
                      vector-effect="non-scaling-stroke"
                    />

                    <path
                      v-if="hourlyTrendAreaPath"
                      :d="hourlyTrendAreaPath"
                      fill="url(#hotboard-trend-area)"
                      class="hotboard-trend-area"
                      aria-hidden="true"
                    />
                    <path
                      v-if="hourlyTrendPath"
                      :d="hourlyTrendPath"
                      fill="none"
                      stroke="url(#hotboard-trend-stroke)"
                      stroke-width="9"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      vector-effect="non-scaling-stroke"
                      class="hotboard-trend-path-aura"
                      aria-hidden="true"
                    />
                    <path
                      v-if="hourlyTrendPath"
                      :d="hourlyTrendPath"
                      fill="none"
                      stroke="url(#hotboard-trend-stroke)"
                      stroke-width="3.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      vector-effect="non-scaling-stroke"
                      class="hotboard-trend-path"
                    />

                    <template v-if="hoveredTrendHour !== null">
                      <line
                        :x1="trendX(hoveredTrendHour)"
                        y1="0"
                        :x2="trendX(hoveredTrendHour)"
                        y2="320"
                        class="hotboard-trend-hover-line"
                        vector-effect="non-scaling-stroke"
                      />
                    </template>
                  </svg>

                  <div
                    v-if="trendHoverSummary"
                    class="hotboard-trend-tooltip"
                    :style="trendHoverTooltipStyle"
                    aria-hidden="true"
                  >
                    <strong>{{ trendHoverSummary.label }}</strong>
                    <span>整体相对走势</span>
                  </div>

                  <div class="hotboard-trend-axis" aria-hidden="true">
                    <span class="hotboard-trend-label">0:00</span>
                    <span class="hotboard-trend-label">6:00</span>
                    <span class="hotboard-trend-label">12:00</span>
                    <span class="hotboard-trend-label">18:00</span>
                    <span class="hotboard-trend-label">24:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <EmptyState
          v-else
          icon="📊"
          text="暂无热榜数据"
          hint="今日还没有足够的浏览和成交数据"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick } from 'vue'
import { ChartNoAxesColumnIncreasing, ClipboardPenLine, ShoppingBag, Store } from '@lucide/vue'
import { useRouter, useRoute } from 'vue-router'
import { useShopStore } from '@/stores/shop'
import { useUserStore } from '@/stores/user'
import { api } from '@/utils/api'
import { useToast } from '@/composables/useToast'
import { formatRelativeTime, formatPrice, formatNumber } from '@/utils/format'
import ProductCard from '@/components/product/ProductCard.vue'
import ShopCard from '@/components/shop/ShopCard.vue'
import CategoryFilter from '@/components/product/CategoryFilter.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import LiquidTabs from '@/components/common/LiquidTabs.vue'
import AvatarImage from '@/components/common/AvatarImage.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import { MAINTENANCE_STATE, isMaintenanceFeatureEnabled, isRestrictedMaintenanceMode } from '@/config/maintenance'

defineOptions({ name: 'Home' })

const router = useRouter()
const route = useRoute()
const shopStore = useShopStore()
const userStore = useUserStore()
const toast = useToast()

const isProductListHiddenByMaintenance = computed(() => (
  isRestrictedMaintenanceMode() && !isMaintenanceFeatureEnabled('productListRead')
))
const maintenanceTitle = computed(() => MAINTENANCE_STATE.title || 'LD士多受限维护中')
const maintenanceCatalogHint = computed(() => (
  MAINTENANCE_STATE.message || '因 LinuxDo 暂时下线 Credit 积分服务，物品列表已临时隐藏。'
))

const sentinel = ref(null)
const sectionTabs = computed(() => {
  const tabs = [
    { value: 'products', label: '物品广场', iconComponent: ShoppingBag },
    { value: 'buy', label: '求购广场', iconComponent: ClipboardPenLine },
    { value: 'stores', label: '小店集市', iconComponent: Store }
  ]
  if (userStore.isLoggedIn && (userStore.trustLevel || 0) >= 1) {
    tabs.push({ value: 'hotboard', label: '士多热榜', iconComponent: ChartNoAxesColumnIncreasing })
  }
  return tabs.map(tab => ({ ...tab, id: `home-tab-${tab.value}`, panelId: `home-panel-${tab.value}` }))
})
const normalizeSection = (value) => (
  sectionTabs.value.some(tab => tab.value === value) ? value : 'products'
)
const activeSection = ref(normalizeSection(String(route.query.section || '').trim()))

watch(sectionTabs, (tabs) => {
  if (!tabs.some(t => t.value === activeSection.value)) {
    activeSection.value = 'products'
    stopHotboardRefresh()
  }
})

const sortTabs = [
  { value: 'default', label: '默认' },
  { value: 'newest', label: '最新' },
  { value: 'price_asc', label: '价格↑' },
  { value: 'price_desc', label: '价格↓' },
  { value: 'sales', label: '销量' }
]
const priceMinInput = ref('')
const priceMaxInput = ref('')

const shops = ref([])
const shopsLoading = ref(false)
const shopsLoaded = ref(false)
const shopsInitialLoading = ref(true)
const shopsTotal = ref(0)
const shopsPage = ref(1)
const shopsPageSize = 20
const shopsHasMore = ref(false)
const shopsSentinel = ref(null)
let shopsObserver = null
const shopsTagFilter = ref([])
const shopsSearchKeyword = ref('')
const SHOPS_TAGS = ['订阅', '服务', '小鸡', 'AI', '娱乐', '公益站']
const tagClassMap = { '订阅': 'subscription', '服务': 'service', '小鸡': 'vps', 'AI': 'ai', '娱乐': 'entertainment', '公益站': 'charity' }

const buyRequests = ref([])
const buyLoading = ref(false)
const buyInitialized = ref(false)
const buyStatusFilter = ref('')
const buySearchKeyword = ref('')
const buyStatusOptions = [
  { value: 'open', label: '开放中' },
  { value: 'negotiating', label: '洽谈中' },
  { value: 'matched', label: '已匹配' }
]
const buyPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
})

const hotboardData = ref(null)
const hotboardLoading = ref(false)
const hotboardLoaded = ref(false)
const hotboardError = ref('')
const hotboardCacheTime = ref(0)
const HOTBOARD_CACHE_TTL = 2 * 60 * 1000
let hotboardRefreshTimer = null
let hotboardRequestId = 0

const TREND_COLORS = [
  '#b5a898', '#7eb89a', '#e8a860', '#778d9c', '#c98b8b', '#8ba5c9', '#b8a0d0', '#6ca7a3'
]

const stats = ref({
  products: { total: 0, online: 0 },
  orders: { total: 0, today: 0, week: 0 },
  stores: 0
})

let observer = null
const initialLoading = ref(true)
const hasInitialized = ref(false)

let savedScrollPosition = 0
let latestCatalogActionId = 0

const categoryCache = ref(new Map())
const CATEGORY_CACHE_TTL = 5 * 60 * 1000

function consumeStoreError(fallback = '') {
  return shopStore.consumeLastError?.() || fallback
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : []
}

function formatPriceFilterInput(value) {
  return value === null || value === undefined || value === '' ? '' : String(value)
}

function normalizePriceFilterInput(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = Number.parseFloat(text)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.round(parsed * 100) / 100)
}

function normalizePriceFilterRange(priceMin, priceMax) {
  let normalizedMin = normalizePriceFilterInput(priceMin)
  let normalizedMax = normalizePriceFilterInput(priceMax)

  if (normalizedMin !== null && normalizedMax !== null && normalizedMin > normalizedMax) {
    ;[normalizedMin, normalizedMax] = [normalizedMax, normalizedMin]
  }

  return {
    priceMin: normalizedMin,
    priceMax: normalizedMax
  }
}

function syncPriceFilterInputs(priceMin, priceMax) {
  priceMinInput.value = formatPriceFilterInput(priceMin)
  priceMaxInput.value = formatPriceFilterInput(priceMax)
}

function buildCatalogFilters(overrides = {}) {
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(overrides, key)
  const priceRange = normalizePriceFilterRange(
    hasOwn('priceMin') ? overrides.priceMin : shopStore.currentPriceMin,
    hasOwn('priceMax') ? overrides.priceMax : shopStore.currentPriceMax
  )

  return {
    inStockOnly: hasOwn('inStockOnly') ? !!overrides.inStockOnly : !!shopStore.inStockOnly,
    priceMin: priceRange.priceMin,
    priceMax: priceRange.priceMax
  }
}

const getCacheKey = (categoryId, sortKey, filters = buildCatalogFilters()) => [
  categoryId || 'all',
  sortKey || 'default',
  filters.inStockOnly ? 'stock' : 'all-stock',
  filters.priceMin ?? 'min-any',
  filters.priceMax ?? 'max-any'
].join('_')

function isSameCatalogState(categoryId, sortKey, filters = buildCatalogFilters()) {
  return String(shopStore.currentCategory) === String(categoryId || '')
    && (shopStore.currentSort || 'default') === (sortKey || 'default')
    && !!shopStore.inStockOnly === !!filters.inStockOnly
    && shopStore.currentPriceMin === (filters.priceMin ?? null)
    && shopStore.currentPriceMax === (filters.priceMax ?? null)
}

function tryRestoreFromCache(categoryId, sortKey, filters = buildCatalogFilters()) {
  const cacheKey = getCacheKey(categoryId, sortKey, filters)
  const cached = categoryCache.value.get(cacheKey)
  const now = Date.now()
  if (cached && Array.isArray(cached.products) && (now - cached.timestamp < CATEGORY_CACHE_TTL)) {
    shopStore.restoreFromCache(cached)
    syncPriceFilterInputs(cached.priceMin, cached.priceMax)
    initialLoading.value = false
    return true
  }
  return false
}

function saveCache(categoryId, sortKey, filters = buildCatalogFilters()) {
  const cacheKey = getCacheKey(categoryId, sortKey, filters)
  const productsToCache = toSafeArray(shopStore.products)
  categoryCache.value.set(cacheKey, {
    categoryId,
    products: [...productsToCache],
    total: Number.isFinite(Number(shopStore.total)) ? Number(shopStore.total) : productsToCache.length,
    hasMore: !!shopStore.hasMore,
    page: Number.isFinite(Number(shopStore.page)) ? Number(shopStore.page) : 1,
    cursor: shopStore.catalogCursor || '',
    rankingContext: shopStore.rankingContext || null,
    sort: sortKey || 'default',
    inStockOnly: !!filters.inStockOnly,
    priceMin: filters.priceMin ?? null,
    priceMax: filters.priceMax ?? null,
    timestamp: Date.now()
  })
}

const categories = computed(() => toSafeArray(shopStore.categories))
const products = computed(() => toSafeArray(shopStore.products))
const currentCategory = computed(() => shopStore.currentCategory)
const currentCategoryName = computed(() => shopStore.currentCategoryName)
const currentSort = computed({
  get: () => shopStore.currentSort,
  set: (val) => { shopStore.currentSort = val }
})
const inStockOnly = computed(() => shopStore.inStockOnly)
const loading = computed(() => shopStore.loading)
const hasMore = computed(() => shopStore.hasMore)
const total = computed(() => shopStore.total)
const hasActivePriceFilter = computed(() => shopStore.currentPriceMin !== null || shopStore.currentPriceMax !== null)
const hasDraftPriceFilter = computed(() => (
  normalizePriceFilterInput(priceMinInput.value) !== null || normalizePriceFilterInput(priceMaxInput.value) !== null
))
const activePriceFilterLabel = computed(() => {
  const { priceMin, priceMax } = buildCatalogFilters()
  if (priceMin !== null && priceMax !== null) return `价格 ${priceMin} - ${priceMax} LDC`
  if (priceMin !== null) return `价格 ≥ ${priceMin} LDC`
  if (priceMax !== null) return `价格 ≤ ${priceMax} LDC`
  return ''
})

watch(
  () => [shopStore.currentPriceMin, shopStore.currentPriceMax],
  ([priceMin, priceMax]) => {
    syncPriceFilterInputs(priceMin, priceMax)
  },
  { immediate: true }
)

const marketCategories = computed(() => categories.value.filter((c) => {
  const name = String(c?.name || '')
  if (!name) return false
  if (name === '小店' || name === '友情小店') return false
  return true
}))
const marketProducts = computed(() =>
  toSafeArray(products.value).filter(p => p?.product_type !== 'store')
)

const gridColumns = ref(2)
function updateGridColumns() {
  const width = window.innerWidth
  if (width >= 1024) gridColumns.value = 4
  else if (width >= 768) gridColumns.value = 3
  else gridColumns.value = 2
}

async function switchSection(section) {
  activeSection.value = section

  const currentSection = String(route.query.section || '').trim()
  if (currentSection !== section) {
    try {
      await router.replace({
        query: {
          ...route.query,
          section
        }
      })
    } catch {
      // ignore duplicated navigation errors
    }
  }

  if (section === 'stores') {
    if (!shopsLoaded.value && !shopsLoading.value) {
      await loadShops()
    }
    await nextTick()
    setupShopsInfiniteScroll()
  }

  if (section === 'buy' && !buyInitialized.value) {
    await loadBuyRequests(true)
  }

  if (section === 'hotboard') {
    await loadHotboard()
    startHotboardRefresh()
  } else {
    stopHotboardRefresh()
  }

  if (section === 'products') {
    await nextTick()
    setupInfiniteScroll()
  }
}

function toggleShopsTag(tag) {
  const idx = shopsTagFilter.value.indexOf(tag)
  if (idx >= 0) {
    shopsTagFilter.value.splice(idx, 1)
  } else {
    shopsTagFilter.value.push(tag)
  }
  loadShops(true)
}

function removeShopsTag(tag) {
  const idx = shopsTagFilter.value.indexOf(tag)
  if (idx >= 0) shopsTagFilter.value.splice(idx, 1)
  loadShops(true)
}

function resetShopsFilter() {
  shopsTagFilter.value = []
  shopsSearchKeyword.value = ''
  loadShops(true)
}

async function loadShops(resetPage = true) {
  if (resetPage) {
    shopsPage.value = 1
    shops.value = []
    shopsInitialLoading.value = true
  }
  shopsLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(shopsPage.value),
      pageSize: String(shopsPageSize)
    })
    if (shopsTagFilter.value.length) {
      for (const tag of shopsTagFilter.value) {
        params.append('tag', tag)
      }
    }
    if (shopsSearchKeyword.value.trim()) params.set('search', shopsSearchKeyword.value.trim())
    const result = await api.get(`/api/shops?${params.toString()}`)
    if (result.success && result.data?.shops) {
      const newShops = result.data.shops
      if (resetPage) {
        shops.value = newShops
      } else {
        shops.value = [...shops.value, ...newShops]
      }
      shopsTotal.value = result.data.pagination?.total || newShops.length
      shopsHasMore.value = shopsPage.value < (result.data.pagination?.totalPages || 1)
    } else {
      if (resetPage) shops.value = []
      shopsTotal.value = 0
      shopsHasMore.value = false
      toast.error(result.error || '加载小店列表失败，请稍后重试')
    }
  } catch (error) {
    console.error('Load shops failed:', error)
    toast.error(error.message || '加载小店列表失败，请稍后重试')
  } finally {
    shopsLoading.value = false
    shopsInitialLoading.value = false
    shopsLoaded.value = true
  }
}

async function loadMoreShops() {
  if (shopsLoading.value || !shopsHasMore.value) return
  shopsPage.value++
  await loadShops(false)
}

function setupShopsInfiniteScroll() {
  if (shopsObserver) shopsObserver.disconnect()
  if (!shopsSentinel.value || !shopsHasMore.value) return

  shopsObserver = new IntersectionObserver(
    async (entries) => {
      if (entries[0].isIntersecting && !shopsLoading.value && shopsHasMore.value) {
        await loadMoreShops()
      }
    },
    { rootMargin: '100px' }
  )
  shopsObserver.observe(shopsSentinel.value)
}

function buyStatusText(status) {
  const map = {
    open: '开放中',
    negotiating: '洽谈中',
    matched: '已匹配',
    closed: '已关闭',
    blocked: '已处理'
  }
  return map[status] || status
}

function buyStatusClass(status) {
  const value = String(status || '').toLowerCase()
  if (['open', 'negotiating', 'matched', 'closed', 'blocked', 'pending_review'].includes(value)) {
    return value
  }
  return 'default'
}

function stopHotboardRefresh() {
  if (hotboardRefreshTimer) {
    window.clearInterval(hotboardRefreshTimer)
    hotboardRefreshTimer = null
  }
}

function startHotboardRefresh() {
  stopHotboardRefresh()
  if (activeSection.value !== 'hotboard') return
  hotboardRefreshTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible' && activeSection.value === 'hotboard') {
      loadHotboard(true)
    }
  }, HOTBOARD_CACHE_TTL)
}

async function loadHotboard(force = false) {
  const now = Date.now()
  if (!force && hotboardData.value && (now - hotboardCacheTime.value) < HOTBOARD_CACHE_TTL) {
    return
  }
  if (hotboardLoading.value) return
  const requestId = ++hotboardRequestId
  hotboardLoading.value = true
  if (!hotboardData.value) hotboardError.value = ''
  try {
    const result = await api.get('/api/shop/hotboard')
    if (requestId !== hotboardRequestId) return
    if (result.success && result.data) {
      hotboardData.value = result.data
      hotboardCacheTime.value = Date.now()
      hotboardError.value = ''
    } else {
      hotboardError.value = result.error?.message || result.error || '加载热榜失败'
    }
  } catch (e) {
    hotboardError.value = hotboardData.value ? '热榜更新失败，当前显示上次数据' : '加载热榜失败，请稍后重试'
    console.error('Load hotboard failed:', e)
  } finally {
    hotboardLoading.value = false
    hotboardLoaded.value = !!hotboardData.value
  }
}

async function loadBuyRequests(resetPage = true) {
  if (resetPage) {
    buyPagination.page = 1
  }

  buyLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(buyPagination.page),
      pageSize: String(buyPagination.pageSize),
      sort: 'random'
    })
    if (buyStatusFilter.value) params.set('status', buyStatusFilter.value)
    if (buySearchKeyword.value.trim()) params.set('search', buySearchKeyword.value.trim())

    const result = await api.get(`/api/shop/buy-requests?${params.toString()}`)
    if (result.success && result.data) {
      const data = result.data
      buyRequests.value = data.requests || []
      buyPagination.total = data.pagination?.total || 0
      buyPagination.totalPages = data.pagination?.totalPages || 0
      return
    }

    toast.error(result.error || '加载求购信息失败，请稍后重试')
    buyRequests.value = []
    buyPagination.total = 0
    buyPagination.totalPages = 0
  } catch (error) {
    console.error('Load buy requests failed:', error)
    toast.error(error.message || '加载求购信息失败，请稍后重试')
    buyRequests.value = []
    buyPagination.total = 0
    buyPagination.totalPages = 0
  } finally {
    buyLoading.value = false
    buyInitialized.value = true
  }
}

function goBuyPage(page) {
  if (page < 1 || page > buyPagination.totalPages) return
  buyPagination.page = page
  loadBuyRequests(false)
}

function publishBuyRequest() {
  if (!userStore.isLoggedIn) {
    router.push({ name: 'Login', query: { redirect: '/buy-requests/new' } })
    return
  }
  router.push('/buy-requests/new')
}

async function loadCatalogState({
  categoryId = shopStore.currentCategory,
  sortKey = shopStore.currentSort || 'default',
  filters = buildCatalogFilters(),
  actionId = null,
  useCache = true
} = {}) {
  if (useCache && tryRestoreFromCache(categoryId, sortKey, filters)) {
    if (actionId !== null && actionId !== latestCatalogActionId) {
      return { success: false, cancelled: true, error: '' }
    }

    await nextTick()
    if (actionId !== null && actionId !== latestCatalogActionId) {
      return { success: false, cancelled: true, error: '' }
    }

    setupInfiniteScroll()
    return { success: true, restored: true }
  }

  initialLoading.value = true
  const result = await shopStore.fetchProducts({
    categoryId,
    forceRefresh: true,
    sort: sortKey,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax
  })

  if (actionId !== null && actionId !== latestCatalogActionId) {
    return { success: false, cancelled: true, error: '' }
  }

  initialLoading.value = false
  if (!result?.success) {
    return result
  }

  if (isSameCatalogState(categoryId, sortKey, filters)) {
    saveCache(categoryId, sortKey, filters)
  }
  syncPriceFilterInputs(filters.priceMin, filters.priceMax)

  await nextTick()
  if (actionId !== null && actionId !== latestCatalogActionId) {
    return { success: false, cancelled: true, error: '' }
  }

  setupInfiniteScroll()
  return result
}

async function handleCategorySelect(categoryId) {
  const actionId = ++latestCatalogActionId
  const sortKey = shopStore.currentSort || 'default'
  const filters = buildCatalogFilters()
  const result = await loadCatalogState({ categoryId, sortKey, filters, actionId })
  if (!result?.success && !result?.cancelled) {
    toast.error(result?.error || consumeStoreError('加载物品失败，请稍后重试'))
  }
}

async function handleSortChange(sort) {
  const actionId = ++latestCatalogActionId
  const categoryId = shopStore.currentCategory
  const filters = buildCatalogFilters()
  const result = await loadCatalogState({ categoryId, sortKey: sort, filters, actionId })
  if (!result?.success && !result?.cancelled) {
    toast.error(result?.error || consumeStoreError('加载物品失败，请稍后重试'))
  }
}

async function handleToggleInStock() {
  categoryCache.value.clear()
  initialLoading.value = true
  const result = await shopStore.toggleInStockOnly()
  initialLoading.value = false
  if (!result?.success) {
    toast.error(result?.error || consumeStoreError('加载物品失败，请稍后重试'))
    return
  }
  saveCache(shopStore.currentCategory, shopStore.currentSort || 'default', buildCatalogFilters())
  await nextTick()
  setupInfiniteScroll()
}

async function applyPriceFilter() {
  const actionId = ++latestCatalogActionId
  const categoryId = shopStore.currentCategory
  const sortKey = shopStore.currentSort || 'default'
  const filters = buildCatalogFilters(normalizePriceFilterRange(priceMinInput.value, priceMaxInput.value))
  syncPriceFilterInputs(filters.priceMin, filters.priceMax)

  const result = await loadCatalogState({ categoryId, sortKey, filters, actionId })
  if (!result?.success && !result?.cancelled) {
    toast.error(result?.error || consumeStoreError('加载物品失败，请稍后重试'))
  }
}

async function clearPriceFilter() {
  if (!hasDraftPriceFilter.value && !hasActivePriceFilter.value) return
  priceMinInput.value = ''
  priceMaxInput.value = ''

  const actionId = ++latestCatalogActionId
  const categoryId = shopStore.currentCategory
  const sortKey = shopStore.currentSort || 'default'
  const filters = buildCatalogFilters({ priceMin: null, priceMax: null })
  const result = await loadCatalogState({ categoryId, sortKey, filters, actionId })
  if (!result?.success && !result?.cancelled) {
    toast.error(result?.error || consumeStoreError('加载物品失败，请稍后重试'))
  }
}

async function recoverProductsIfNeeded() {
  if (loading.value || initialLoading.value) return
  if (marketProducts.value.length > 0) return

  const categoryId = shopStore.currentCategory
  const sortKey = shopStore.currentSort || 'default'
  const filters = buildCatalogFilters()
  const restored = tryRestoreFromCache(categoryId, sortKey, filters)
  if (restored) {
    return
  }

  const result = await loadCatalogState({ categoryId, sortKey, filters, useCache: false })
  if (!result?.success && !result?.cancelled) {
    toast.error(result?.error || consumeStoreError('加载物品失败，请稍后重试'))
  }
}

onMounted(async () => {
  updateGridColumns()
  window.addEventListener('resize', updateGridColumns)

  if (hasInitialized.value) {
    initialLoading.value = false
    return
  }

  await shopStore.fetchCategories()
  const categoryError = consumeStoreError('')
  if (categoryError) {
    toast.warning(categoryError)
  }

  const productResult = await loadCatalogState({
    categoryId: '',
    sortKey: shopStore.currentSort || 'default',
    filters: buildCatalogFilters(),
    useCache: false
  })
  if (!productResult?.success) {
    toast.error(productResult?.error || consumeStoreError('加载物品失败，请稍后重试'))
  }

  initialLoading.value = false
  hasInitialized.value = true

  const statsData = await shopStore.fetchPublicStats()
  if (statsData) {
    stats.value = statsData
  } else {
    const statsError = consumeStoreError('')
    if (statsError) {
      toast.warning(statsError)
    }
  }

  if (activeSection.value === 'stores') {
    if (!shopsLoaded.value && !shopsLoading.value) {
      await loadShops()
    }
    await nextTick()
    setupShopsInfiniteScroll()
  } else if (activeSection.value === 'buy') {
    await loadBuyRequests(true)
  } else if (activeSection.value === 'hotboard') {
    await loadHotboard()
    startHotboardRefresh()
  }

  if (activeSection.value === 'products') {
    setupInfiniteScroll()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateGridColumns)
  stopHotboardRefresh()
  if (observer) observer.disconnect()
  if (shopsObserver) shopsObserver.disconnect()
})

onActivated(async () => {
  if (savedScrollPosition > 0) {
    await nextTick()
    window.scrollTo(0, savedScrollPosition)
  }

  if (activeSection.value === 'products') {
    await recoverProductsIfNeeded()
    await nextTick()
    setupInfiniteScroll()
  } else if (activeSection.value === 'stores') {
    if (!shopsLoaded.value && !shopsLoading.value) {
      await loadShops()
    }
    await nextTick()
    setupShopsInfiniteScroll()
  } else if (activeSection.value === 'buy' && !buyInitialized.value) {
    await loadBuyRequests(true)
  } else if (activeSection.value === 'hotboard') {
    await loadHotboard()
    startHotboardRefresh()
  }
})

onDeactivated(() => {
  savedScrollPosition = window.scrollY
  stopHotboardRefresh()
  if (observer) observer.disconnect()
  if (shopsObserver) shopsObserver.disconnect()
})

watch(hasMore, (newVal) => {
  if (newVal && activeSection.value === 'products') {
    setupInfiniteScroll()
  }
})

watch(shopsHasMore, (newVal) => {
  if (newVal && activeSection.value === 'stores') {
    setupShopsInfiniteScroll()
  }
})

function setupInfiniteScroll() {
  if (observer) observer.disconnect()
  if (!sentinel.value || !hasMore.value) return

  observer = new IntersectionObserver(
    async (entries) => {
      if (entries[0].isIntersecting && !loading.value && hasMore.value) {
        const result = await shopStore.loadMore()
        if (result && result.success === false && !result.cancelled) {
          toast.error(result.error || consumeStoreError('加载更多失败，请稍后重试'))
          return
        }
        saveCache(shopStore.currentCategory, shopStore.currentSort || 'default', buildCatalogFilters())
      }
    },
    { rootMargin: '100px' }
  )

  observer.observe(sentinel.value)
}

// Trend chart: a high-density vector canvas keeps curves crisp on HiDPI screens.
const TVB_W = 960
const TVB_H = 320
const TVB_PAD_Y = 18
const TVB_PLOT_H = TVB_H - TVB_PAD_Y * 2
const trendGridY = [TVB_PAD_Y, TVB_H / 2, TVB_H - TVB_PAD_Y]
const trendGridHours = [0, 6, 12, 18, 24]
const TREND_VALUE_MAX = 100
const trendShareFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 })

const rawTrendCategories = computed(() => toSafeArray(hotboardData.value?.categoryTrend))
const rawHourlyTrend = computed(() => toSafeArray(hotboardData.value?.hourlyTrend))
const trendHours = computed(() => {
  const endHour = Number(hotboardData.value?.trendEndHour)
  const lastHour = Number.isFinite(endHour)
    ? Math.min(23, Math.max(0, Math.floor(endHour)))
    : 23
  return Array.from({ length: lastHour + 1 }, (_, hour) => hour)
})

const trendChartModel = computed(() => rawTrendCategories.value.map((cat, colorIndex) => {
  const orderShareBps = Math.min(10000, Math.max(0, Number(cat.orderShareBps) || 0))
  return {
    ...cat,
    color: TREND_COLORS[colorIndex % TREND_COLORS.length],
    orderShareBps
  }
}).sort((a, b) => b.orderShareBps - a.orderShareBps))

const hourlyTrendPoints = computed(() => {
  if (!rawHourlyTrend.value.length) return []
  const pointsByHour = new Map(rawHourlyTrend.value.map(point => [Number(point?.hour), point]))
  return trendHours.value.map(hour => {
    const point = pointsByHour.get(hour) || {}
    return {
      hour,
      trendValue: Math.min(TREND_VALUE_MAX, Math.max(0, Number(point.trendValue) || 0))
    }
  })
})
const hourlyTrendPath = computed(() => trendCurve(hourlyTrendPoints.value))
const hourlyTrendAreaPath = computed(() => {
  const points = hourlyTrendPoints.value
  if (!points.length || !hourlyTrendPath.value) return ''
  const first = points[0]
  const last = points[points.length - 1]
  const baseline = TVB_H - TVB_PAD_Y
  return `${hourlyTrendPath.value} L ${trendX(last.hour)} ${baseline} L ${trendX(first.hour)} ${baseline} Z`
})

const trendEndHourLabel = computed(() => {
  const current = hotboardData.value?.currentBeijingTime
  if (current && Number.isFinite(Number(current.hour))) {
    return `${String(Number(current.hour)).padStart(2, '0')}:${String(Number(current.minute) || 0).padStart(2, '0')}`
  }
  const lastHour = trendHours.value[trendHours.value.length - 1] || 0
  return `${String(lastHour + 1).padStart(2, '0')}:00`
})

const trendChartAriaLabel = computed(() => {
  return `北京时间逐时订单整体走势，显示至 ${trendEndHourLabel.value}。图表使用平滑归一化相对趋势，不包含分时订单数。`
})

const hoveredTrendHour = ref(null)
const trendProgressX = computed(() => {
  const endHour = Number(hotboardData.value?.trendEndHour)
  if (!Number.isFinite(endHour)) return TVB_W
  return Math.min(TVB_W, Math.max(0, (endHour / 24) * TVB_W))
})

const trendHoverSummary = computed(() => {
  const hour = hoveredTrendHour.value
  if (hour === null || hourlyTrendPoints.value.length === 0) return null
  return {
    label: `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`
  }
})

const trendHoverTooltipStyle = computed(() => {
  const hour = hoveredTrendHour.value ?? 0
  const rawLeft = ((hour + 0.5) / 24) * 100
  return { left: `${Math.min(88, Math.max(12, rawLeft))}%` }
})

function getCatBarWidth(cat) {
  return cat.orderShareBps / 100
}

function formatTrendShare(cat) {
  const percentage = getCatBarWidth(cat)
  return `${trendShareFormatter.format(percentage)}%`
}

function trendX(hour) {
  return ((hour + 0.5) / 24) * TVB_W
}

function trendTimeX(hour) {
  return (hour / 24) * TVB_W
}

function trendY(value, maxVal = TREND_VALUE_MAX) {
  return TVB_PAD_Y + TVB_PLOT_H - (Math.max(0, Number(value) || 0) / maxVal) * TVB_PLOT_H
}

function trendCurve(points, maxVal = TREND_VALUE_MAX) {
  if (!points.length) return ''
  const coordinates = points.map(point => ({
    x: trendX(point.hour),
    y: trendY(point.trendValue, maxVal)
  }))
  if (coordinates.length === 1) return `M ${coordinates[0].x} ${coordinates[0].y}`

  // Monotone cubic interpolation keeps every control point within its adjacent
  // values, avoiding the overshoot and visual loops produced by free splines.
  const slopes = coordinates.slice(0, -1).map((point, index) => (
    (coordinates[index + 1].y - point.y) / (coordinates[index + 1].x - point.x)
  ))
  const tangents = coordinates.map((_, index) => {
    if (index === 0) return slopes[0]
    if (index === coordinates.length - 1) return slopes[slopes.length - 1]
    const previous = slopes[index - 1]
    const next = slopes[index]
    if (previous === 0 || next === 0 || previous * next < 0) return 0
    return (2 * previous * next) / (previous + next)
  })
  const precise = value => Number(value.toFixed(2))
  let path = `M ${precise(coordinates[0].x)} ${precise(coordinates[0].y)}`
  for (let index = 0; index < coordinates.length - 1; index++) {
    const current = coordinates[index]
    const next = coordinates[index + 1]
    const distance = next.x - current.x
    const minY = Math.min(current.y, next.y)
    const maxY = Math.max(current.y, next.y)
    const clampSegmentY = value => Math.min(maxY, Math.max(minY, value))
    const controlOne = { x: current.x + distance / 3, y: clampSegmentY(current.y + tangents[index] * distance / 3) }
    const controlTwo = { x: next.x - distance / 3, y: clampSegmentY(next.y - tangents[index + 1] * distance / 3) }
    path += ` C ${precise(controlOne.x)} ${precise(controlOne.y)}, ${precise(controlTwo.x)} ${precise(controlTwo.y)}, ${precise(next.x)} ${precise(next.y)}`
  }
  return path
}

function updateTrendHover(event) {
  const bounds = event.currentTarget.getBoundingClientRect()
  if (!bounds.width) return
  const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
  const lastHour = trendHours.value[trendHours.value.length - 1] || 0
  hoveredTrendHour.value = Math.min(lastHour, Math.max(0, Math.round(ratio * 24 - 0.5)))
}

function clearTrendHover() {
  hoveredTrendHour.value = null
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  padding-bottom: 80px;
}

.home-banner {
  gap: 10px;
  margin-top: 18px;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

/* Banner - 液态玻璃效果 */
.home-banner {
  position: relative;
  background: var(--glass-bg-heavy);
  border-radius: 24px;
  padding: 28px 24px;
  margin-bottom: 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  border: 1px solid var(--glass-border-light);
  box-shadow: 
    0 8px 32px var(--glass-shadow),
    0 2px 8px var(--glass-shadow-light),
    inset 0 1px 0 var(--glass-shine-strong);
  overflow: hidden;
}

/* Banner 内部光泽 */
.home-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    180deg,
    var(--glass-shine) 0%,
    rgba(255, 255, 255, 0.05) 60%,
    transparent 100%
  );
  border-radius: 24px 24px 50% 50%;
  pointer-events: none;
}

.banner-content {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.banner-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.banner-subtitle {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0;
}

.highlight-yellow {
  color: var(--color-warning);
  font-weight: 700;
}

.link-credit {
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.link-credit:hover {
  opacity: 0.8;
}

.highlight-red {
  color: var(--color-danger);
  font-weight: 700;
}

.link-linuxdo {
  color: var(--text-primary);
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s ease;
}

.link-linuxdo:hover {
  color: var(--color-primary);
}

.banner-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: flex-end;
  position: relative;
  z-index: 1;
}

.stat-group {
  display: flex;
  gap: 16px;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--border-light);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* 板块切换 */
.section-tabs-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.tab-text {
  font-weight: 600;
}

.tab-count {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.section-tab.active .tab-count {
  background: #b5a898;
  color: white;
}

/* 内容区域 */
.section-content {
  animation: fadeIn 0.3s ease;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 分类筛选 */
.filter-section {
  margin-bottom: 12px;
}

/* 排序和筛选选项 */
.sort-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.sort-options {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.catalog-filters {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 1 1 360px;
  flex-wrap: wrap;
}

.sort-btn {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.sort-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.sort-btn:focus-visible,
.price-filter-btn:focus-visible,
.stock-filter-input:focus-visible + .checkbox,
.buy-card-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.sort-btn.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
  font-weight: 500;
}

.price-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.price-filter-input {
  width: 112px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.2;
}

.price-filter-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.price-filter-separator {
  font-size: 12px;
  color: var(--text-tertiary);
}

.price-filter-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.price-filter-btn:hover {
  opacity: 0.92;
}

.price-filter-btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* 库存筛选 */
.stock-filter {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.stock-filter-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.stock-filter .checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  transition: all 0.2s ease;
}

.stock-filter .checkbox.checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.stock-filter .checkmark {
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.stock-filter .filter-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.stock-filter:hover .checkbox {
  border-color: var(--color-primary);
}

/* 物品头部 */
.products-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.products-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.products-count strong {
  color: var(--text-primary);
}

.products-count .filter-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--color-success);
  background: var(--color-success-bg);
  border-radius: 10px;
}

.products-count .filter-tag.price-tag {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* 小店集市头部 */
.stores-header {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: var(--color-success-bg);
  border-radius: 14px;
}

.stores-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-success);
}

.stores-grid {
  /* 小店网格使用默认样式 */
  grid-gap: 16px;
}

/* 小店筛选 */
.stores-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stores-tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stores-tag-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.stores-tag-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.stores-tag-btn.active {
  font-weight: 600;
  border-color: transparent;
}

/* 选中状态：各标签配色 */
.stores-tag-btn.active.tag-subscription { background: #e2e8df; color: #6d7f6d; }
.stores-tag-btn.active.tag-service { background: #dde2ea; color: #5f6f80; }
.stores-tag-btn.active.tag-vps { background: #e8e2d8; color: #7d7060; }
.stores-tag-btn.active.tag-ai { background: #e3dfe8; color: #706480; }
.stores-tag-btn.active.tag-entertainment { background: #e8dee0; color: #806068; }
.stores-tag-btn.active.tag-charity { background: #e5dde3; color: #706070; }

/* 选中标签的 × 按钮 */
.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  color: white;
  font-size: 10px;
  line-height: 1;
  margin-left: 2px;
  flex-shrink: 0;
  transition: background 0.15s;
}

.stores-tag-btn:hover .tag-remove {
  background: rgba(0, 0, 0, 0.35);
}

.stores-search {
  flex: 1;
  position: relative;
  min-width: 0;
}

.stores-search-input {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  padding: 10px 12px;
  padding-right: 40px;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.stores-search-input:focus {
  outline: none;
  background: var(--input-focus-bg);
  border-color: var(--input-focus-border);
  box-shadow: 0 2px 8px var(--glass-shadow-light);
}

.stores-search-input::placeholder {
  color: var(--text-placeholder);
}

.stores-search-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  background: var(--glass-bg-heavy);
  color: var(--text-secondary);
  border: none;
  cursor: pointer;
}

.stores-reset-btn {
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.stores-reset-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* 物品网格 */
.buy-header {
  margin-bottom: 14px;
  padding: 16px 20px;
  background: #eef7f0;
  border: 1px solid #bde8cc;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.buy-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.buy-publish-btn {
  border: none;
  border-radius: 10px;
  background: var(--color-success);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
  white-space: nowrap;
}

.buy-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.buy-toolbar-select {
  flex-shrink: 0;
  min-width: 120px;
}

.buy-toolbar-select .select-trigger {
  min-width: 120px;
}

.buy-toolbar-search {
  flex: 1;
  position: relative;
  min-width: 0;
}

.buy-toolbar-input {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  padding: 10px 12px;
  padding-right: 40px;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.buy-toolbar-input:focus {
  outline: none;
  background: var(--input-focus-bg);
  border-color: var(--input-focus-border);
  box-shadow: 0 2px 8px var(--glass-shadow-light);
}

.buy-toolbar-input::placeholder {
  color: var(--text-placeholder);
}

.buy-toolbar-btn {
  border: none;
  border-radius: 10px;
  background: var(--color-success);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 10px 16px;
  white-space: nowrap;
}

.buy-toolbar-btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.buy-toolbar-btn-search {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  background: var(--glass-bg-heavy);
  color: var(--text-secondary);
}

.buy-toolbar-btn-refresh {
  flex-shrink: 0;
}

.buy-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.buy-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  height: 100%;
  transition: all 0.2s ease;
  isolation: isolate;
}

.buy-card-link {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 14px;
  border-radius: inherit;
  color: inherit;
  text-decoration: none;
}

.buy-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.buy-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.buy-card-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.4;
}

.buy-status-pill {
  border-radius: 999px;
  font-size: 11px;
  padding: 3px 8px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  white-space: nowrap;
  border: 1px solid var(--border-light);
}

.buy-status-open {
  color: #0f6b3a;
  background: #e9f9ef;
  border-color: #bdebcf;
}

.buy-status-negotiating {
  color: #8a4b08;
  background: #fff4e6;
  border-color: #ffd7ad;
}

.buy-status-matched {
  color: #1249a3;
  background: #ebf3ff;
  border-color: #bfd8ff;
}

.buy-status-closed,
.buy-status-blocked {
  color: #6b7280;
  background: #f3f4f6;
  border-color: #d1d5db;
}

.buy-status-pending_review {
  color: #7a2e0e;
  background: #fff1ec;
  border-color: #ffc9b5;
}

.buy-card-detail {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.buy-card-meta {
  margin-top: auto;
  padding-top: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.buy-price {
  color: var(--color-warning);
  font-weight: 600;
}

.buy-meta-sep {
  opacity: 0.5;
}

.buy-card-footer {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-tertiary);
  font-size: 12px;
}

.buy-pagination {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.buy-page-btn {
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 6px 10px;
  cursor: pointer;
}

.buy-page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.buy-page-text {
  color: var(--text-tertiary);
  font-size: 13px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (min-width: 768px) {
  .products-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .buy-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .products-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .buy-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 加载更多 */
.load-more,
.loaded-all {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-medium);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.load-hint {
  opacity: 0.6;
}

.products-loading {
  padding: 20px 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .home-banner {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .banner-stats {
    justify-content: center;
    border-top: 1px solid var(--border-light);
    padding-top: 16px;
    gap: 12px;
  }
  
  .stat-group {
    gap: 12px;
  }
  
  .stat-divider {
    height: 28px;
  }
  
  .stat-value {
    font-size: 18px;
  }
  
  .stat-label {
    font-size: 10px;
  }
  
  .section-tabs {
    gap: 10px;
  }
  
  .section-tab {
    padding: 14px 16px;
    flex-direction: column;
    gap: 4px;
  }

  .sort-section {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .sort-options {
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex-wrap: nowrap;
  }

  .sort-options::-webkit-scrollbar {
    display: none;
  }

  .sort-btn {
    flex-shrink: 0;
    min-height: 44px;
  }

  .catalog-filters {
    flex: 0 0 auto;
    width: 100%;
    justify-content: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }

  .price-filter {
    width: 100%;
    gap: 4px;
    flex-shrink: 1;
    min-width: 0;
  }

  .price-filter-input {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    min-height: 44px;
    padding: 6px 8px;
  }

  .price-filter-separator {
    flex-shrink: 0;
  }

  .price-filter-btn {
    min-height: 44px;
    padding: 6px 10px;
    flex-shrink: 0;
  }

  .stock-filter {
    min-height: 44px;
  }
  
  .tab-icon {
    font-size: 24px;
  }
  
  .tab-text {
    font-size: 13px;
  }
}

@media (max-width: 640px) {
  .page-container {
    padding: 12px;
  }

  .home-banner {
    padding: 20px 16px;
  }

  .banner-title {
    font-size: 24px;
  }
  
  .banner-stats {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .stat-group {
    gap: 8px;
  }
  
  .stat-item {
    min-width: 42px;
  }

  .catalog-filters {
    gap: 10px;
  }

  .price-filter-btn {
    flex: 1 1 auto;
    justify-content: center;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .section-tab {
    padding: 12px 10px;
  }
  
  .tab-count {
    font-size: 11px;
    padding: 2px 6px;
  }
  
  .stores-header {
    padding: 12px 16px;
  }

  .stores-desc {
    font-size: 13px;
  }

  .stores-filter {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .stores-search-input {
    min-height: 44px;
    padding: 8px 48px 8px 10px;
    font-size: 16px;
  }

  .stores-search-btn {
    width: 40px;
    height: 40px;
  }

  .stores-tag-btn {
    min-height: 44px;
    padding: 6px 10px;
    font-size: 12px;
  }

  .stores-reset-btn {
    min-height: 44px;
    padding: 7px 12px;
    font-size: 12px;
  }

  .buy-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .buy-toolbar {
    gap: 6px;
  }

  .buy-toolbar-select {
    min-width: unset;
    width: auto;
  }

  .buy-toolbar-select .select-trigger {
    min-width: unset;
    min-height: 36px;
    padding: 7px 28px 7px 10px;
    font-size: 13px;
  }

  .buy-toolbar-select .select-arrow {
    right: 10px;
    width: 14px;
    height: 14px;
  }

  .buy-toolbar-input {
    min-height: 44px;
    padding: 8px 48px 8px 10px;
    font-size: 16px;
  }

  .buy-toolbar-btn-search {
    width: 40px;
    height: 40px;
  }

  .buy-toolbar-btn-refresh {
    min-height: 44px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .buy-publish-btn,
  .buy-page-btn {
    min-height: 44px;
  }
}

/* ── Hotboard ── */
.hotboard-section-wrapper {
  animation: fadeIn 0.3s ease;
}

.hotboard-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Hero — liquid glass card */
.hotboard-hero {
  position: relative;
  background: var(--glass-bg-heavy);
  border-radius: 20px;
  padding: 24px 28px 20px;
  border: 1px solid var(--glass-border-light);
  box-shadow:
    0 8px 32px var(--glass-shadow),
    0 2px 8px var(--glass-shadow-light),
    inset 0 1px 0 var(--glass-shine-strong);
  overflow: hidden;
}

.hotboard-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    180deg,
    var(--glass-shine) 0%,
    rgba(255, 255, 255, 0.05) 60%,
    transparent 100%
  );
  border-radius: 20px 20px 50% 50%;
  pointer-events: none;
}

.hotboard-hero-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.hotboard-hero-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
}

.hotboard-hero-icon {
  font-size: 26px;
}

.hotboard-hero-tl {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--color-primary-bg, rgba(181, 168, 152, 0.12));
  color: var(--color-primary);
  letter-spacing: 0.5px;
}

.hotboard-hero-stats {
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: 20px;
  position: relative;
  z-index: 1;
}

.hotboard-hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 60px;
}

.hotboard-hero-stat-divider {
  width: 1px;
  height: 32px;
  background: var(--border-light);
  flex-shrink: 0;
}

.hotboard-hero-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.2;
}

.hotboard-hero-stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.hotboard-hero-hint {
  margin: 14px 0 0;
  font-size: 11px;
  color: var(--text-tertiary);
  position: relative;
  z-index: 1;
}

/* Section card — glass card */
.hotboard-section {
  position: relative;
  background: var(--glass-bg-heavy);
  border: 1px solid var(--glass-border, rgba(255,255,255,.1));
  border-radius: 16px;
  padding: 18px 22px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.hotboard-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(
    180deg,
    var(--glass-shine) 0%,
    transparent 100%
  );
  border-radius: 16px 16px 50% 50%;
  pointer-events: none;
}

.hotboard-section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

/* Seller list — clickable cards */
.hotboard-seller-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.hotboard-seller-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--glass-bg-medium, rgba(255,255,255,.05));
  border: 1px solid var(--glass-border, rgba(255,255,255,.08));
  border-radius: 14px;
  padding: 14px 20px;
  flex: 1;
  min-width: 150px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.hotboard-seller-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px var(--glass-shadow);
  border-color: var(--border-medium);
}

.hotboard-seller-item.seller-rank-1 {
  border-color: rgba(255, 215, 0, 0.3);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.07) 0%, var(--glass-bg-medium) 100%);
}

.hotboard-seller-item.seller-rank-1:hover {
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.15);
}

.hotboard-seller-item.seller-rank-2 {
  border-color: rgba(192, 192, 192, 0.25);
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.06) 0%, var(--glass-bg-medium) 100%);
}

.hotboard-seller-item.seller-rank-2:hover {
  border-color: rgba(192, 192, 192, 0.45);
  box-shadow: 0 6px 20px rgba(192, 192, 192, 0.12);
}

.hotboard-seller-item.seller-rank-3 {
  border-color: rgba(205, 127, 50, 0.25);
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.06) 0%, var(--glass-bg-medium) 100%);
}

.hotboard-seller-item.seller-rank-3:hover {
  border-color: rgba(205, 127, 50, 0.45);
  box-shadow: 0 6px 20px rgba(205, 127, 50, 0.12);
}

.hotboard-seller-medal {
  font-size: 22px;
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}

.hotboard-seller-avatar {
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
}

.hotboard-seller-name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Product list */
.hotboard-product-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.hotboard-product-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  background: var(--glass-bg-heavy, rgba(255,255,255,.03));
  border: 1px solid var(--glass-border, rgba(255,255,255,.06));
}

.hotboard-product-item:hover {
  background: var(--glass-bg-medium, rgba(255,255,255,.08));
  border-color: var(--glass-border-light, rgba(255,255,255,.15));
  transform: translateX(4px);
  box-shadow: 0 2px 12px var(--glass-shadow-light);
}

.hotboard-product-image {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border-light);
}

.hotboard-product-image-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  flex-shrink: 0;
  font-size: 20px;
}

.hotboard-product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hotboard-product-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.hotboard-product-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hotboard-product-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  min-width: 56px;
}

.hotboard-product-count {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.2;
}

.hotboard-count-unit {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  margin-left: 1px;
}

.hotboard-product-price {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.hotboard-price-unit {
  font-size: 9px;
  font-weight: 500;
  margin-left: 1px;
  opacity: 0.7;
}

/* Rank badge */
.hotboard-rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.hotboard-rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb800);
  color: #5a4000;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.hotboard-rank-badge.rank-2 {
  background: linear-gradient(135deg, #d1d5db, #b0b5bc);
  color: #3a3a3a;
  box-shadow: 0 2px 8px rgba(192, 192, 192, 0.25);
}

.hotboard-rank-badge.rank-3 {
  background: linear-gradient(135deg, #e8a860, #cd7f32);
  color: #fff;
  box-shadow: 0 2px 8px rgba(205, 127, 50, 0.25);
}

.hotboard-rank-badge.rank-4,
.hotboard-rank-badge.rank-5 {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* Category distribution bars */
.hotboard-cat-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.hotboard-cat-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hotboard-cat-label {
  font-size: 13px;
  font-weight: 500;
  min-width: 70px;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.hotboard-cat-bar-track {
  flex: 1;
  height: 20px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.hotboard-cat-bar-fill {
  height: 100%;
  border-radius: 10px;
  min-width: 4px;
  transition: width 0.4s ease;
  opacity: 0.75;
}

.hotboard-cat-bar-fill:hover {
  opacity: 1;
}

.hotboard-cat-value {
  min-width: 58px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

/* Hourly trend section */
.hotboard-hourly-section {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border-light);
}

.hotboard-hourly-title {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.3;
  color: var(--text-primary);
  margin: 0;
}

.hotboard-hourly-subtitle {
  margin: 3px 0 0;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.4;
}

.hotboard-hourly-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.hotboard-hourly-meta {
  min-height: 28px;
  padding: 5px 10px;
  border: 1px solid var(--border-light);
  border-radius: 999px;
  background: var(--bg-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 11px;
  white-space: nowrap;
}

.hotboard-hourly-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success, #65a87d);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success, #65a87d) 14%, transparent);
}

.hotboard-trend-plot {
  --trend-chart-height: 216px;
  padding: 14px 16px 8px;
  border: 1px solid var(--border-light);
  border-radius: 14px;
  background: var(--bg-secondary);
  background:
    radial-gradient(circle at 82% 18%, rgba(143, 130, 196, 0.08), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 78%, transparent), color-mix(in srgb, var(--bg-primary) 92%, transparent));
  overflow: hidden;
}

.hotboard-trend-chart-wrap {
  min-width: 0;
  position: relative;
  z-index: 1;
}

.hotboard-trend-chart {
  width: 100%;
  height: var(--trend-chart-height);
  display: block;
  overflow: visible;
  touch-action: pan-y;
  text-rendering: geometricPrecision;
}

.hotboard-trend-future {
  fill: var(--bg-tertiary);
  opacity: 0.36;
}

.hotboard-trend-hit-area {
  pointer-events: all;
}

.hotboard-trend-grid-line {
  stroke: var(--border-light);
  stroke-width: 1;
  opacity: 0.72;
}

.hotboard-trend-grid-line-vertical {
  opacity: 0.36;
  stroke-dasharray: 2 5;
}

.hotboard-trend-path {
  opacity: 0.96;
  pointer-events: none;
}

.hotboard-trend-path-aura {
  opacity: 0.11;
  pointer-events: none;
}

.hotboard-trend-area {
  pointer-events: none;
}

.hotboard-trend-hover-line {
  stroke: var(--text-tertiary);
  stroke-width: 1;
  stroke-dasharray: 3 4;
  opacity: 0.72;
  pointer-events: none;
}

.hotboard-trend-tooltip {
  position: absolute;
  top: 10px;
  z-index: 2;
  min-width: 132px;
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  background: var(--bg-primary);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
  white-space: nowrap;
}

.hotboard-trend-tooltip strong {
  color: var(--text-primary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.hotboard-trend-tooltip span {
  color: var(--text-secondary);
  font-size: 11px;
}

.hotboard-trend-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}

.hotboard-trend-label {
  font-size: 10px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.hotboard-error {
  padding: 20px;
}

@media (max-width: 640px) {
  .hotboard-hero {
    padding: 18px 16px 16px;
    border-radius: 16px;
  }

  .hotboard-hero-title {
    font-size: 17px;
  }

  .hotboard-hero-icon {
    font-size: 22px;
  }

  .hotboard-hero-stat-value {
    font-size: 20px;
  }

  .hotboard-hero-stats {
    margin-top: 16px;
  }

  .hotboard-hourly-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .hotboard-trend-plot {
    --trend-chart-height: 188px;
    padding: 12px 10px 7px;
    border-radius: 12px;
  }

  .hotboard-section {
    padding: 14px 16px;
    border-radius: 14px;
  }

  .hotboard-seller-list {
    flex-direction: column;
  }

  .hotboard-seller-item {
    min-width: unset;
  }

  .hotboard-product-item:hover {
    transform: none;
  }

  .hotboard-product-right {
    min-width: 48px;
  }

  .hotboard-cat-value {
    min-width: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hotboard-cat-bar-fill {
    transition: none;
  }
}

/* Dark mode overrides */
:global(html.dark) .buy-header {
  background: #1e2a20;
  border-color: #2a3f2e;
}
</style>
